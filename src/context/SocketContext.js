import React, { createContext, useContext, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getSocketUrl } from '../api/endpoints'
import { useAuth } from './AuthContext'
import { playSirenSound, playRateUpdateSound } from '../utils/sirenSound'
import { toast } from 'react-hot-toast'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const userId = user._id || user.id
    if (!userId) return

    const socketUrl = getSocketUrl()
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      socket.emit('register', { userId: String(userId) })
    })

    socket.on('task:assigned', (payload) => {
      playSirenSound()
      const title = payload?.title || 'New task'
      toast.success(`Task assigned: ${title}`, { duration: 5000 })
    })

    socket.on('task:rateUpdated', (payload) => {
      playRateUpdateSound()
      const title = payload?.title || 'Task'
      const productName = payload?.productName || ''
      const rate =
        payload?.rate != null && !Number.isNaN(Number(payload.rate))
          ? `₹${Number(payload.rate).toLocaleString()}`
          : ''
      const msgParts = []
      if (productName) msgParts.push(productName)
      if (rate) msgParts.push(rate)
      const detail = msgParts.length ? ` (${msgParts.join(' - ')})` : ''
      toast.success(`Price updated for ${title}${detail}`, { duration: 5000 })
    })

    socket.on('connect_error', () => {
      // Optional: silent or toast for debug
    })

    socketRef.current = socket
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
