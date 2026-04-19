import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import employeeLocationService from '../services/employeeLocationService'

const SEND_INTERVAL_MS = 1 * 1000
const REVERSE_GEO_MIN_MS = 30 * 1000
/** If accuracy is worse than this, labels from reverse-geocode are often misleading. */
const MAX_LABEL_ACCURACY_M = 1500

const pickCityFromAddress = (address = {}) => {
  const a = address || {}
  return (
    a.city ||
    a.town ||
    a.municipality ||
    a.city_district ||
    a.county ||
    a.state ||
    ''
  )
}

const pickLocalityFromAddress = (address = {}) => {
  const a = address || {}
  return (
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.village ||
    a.hamlet ||
    a.road ||
    ''
  )
}

const getLocalityAndCity = async (latitude, longitude) => {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
    })
    const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      return { city: '', locality: '' }
    }

    const data = await response.json()
    const address = data?.address || {}
    const city = pickCityFromAddress(address)
    const locality = pickLocalityFromAddress(address)

    return {
      city: String(city || '').trim(),
      locality: String(locality || '').trim(),
    }
  } catch {
    return { city: '', locality: '' }
  }
}

const EmployeeLocationTracker = () => {
  const { isAuthenticated, user } = useAuth()
  const watchIdRef = useRef(null)
  const deniedRef = useRef(false)
  const lastSentAtRef = useRef(0)
  const lastReverseGeoAtRef = useRef(0)
  const cachedCityRef = useRef('')
  const cachedLocalityRef = useRef('')

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      return undefined
    }

    deniedRef.current = false
    lastSentAtRef.current = 0
    lastReverseGeoAtRef.current = 0
    cachedCityRef.current = ''
    cachedLocalityRef.current = ''

    if (!navigator.geolocation) return undefined

    const sendWithPosition = async (position) => {
      const latitude = Number(position.coords.latitude)
      const longitude = Number(position.coords.longitude)
      const accuracyM = Number(position.coords.accuracy)
      const accuracyOk = Number.isFinite(accuracyM) && accuracyM > 0 && accuracyM <= MAX_LABEL_ACCURACY_M

      const now = Date.now()
      if (!accuracyOk) {
        // Coarse fixes (common on desktops without GPS): keep raw coords, avoid misleading labels.
        cachedCityRef.current = ''
        cachedLocalityRef.current = ''
      } else if (now - lastReverseGeoAtRef.current >= REVERSE_GEO_MIN_MS) {
        lastReverseGeoAtRef.current = now
        const { city, locality } = await getLocalityAndCity(latitude, longitude)
        cachedCityRef.current = city
        cachedLocalityRef.current = locality
      }

      try {
        await employeeLocationService.create({
          employeeId: user._id,
          latitude,
          longitude,
          city: cachedCityRef.current,
          locality: cachedLocalityRef.current,
          accuracyM: Number.isFinite(accuracyM) ? accuracyM : null,
        })
      } catch (error) {
        // Log errors so local debugging is easier.
        console.error('Employee location sync failed:', error)
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now()
        if (now - lastSentAtRef.current < SEND_INTERVAL_MS) return
        lastSentAtRef.current = now
        await sendWithPosition(position)
      },
      (error) => {
        // Log geolocation errors so local debugging is easier.
        console.error('Geolocation failed:', error)
        // User denied permission: stop retry loop until next reload/login.
        if (error?.code === 1) {
          deniedRef.current = true
          if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isAuthenticated, user?._id])

  return null
}

export default EmployeeLocationTracker
