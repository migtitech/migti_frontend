import { api } from "../api/axiosClient";
import { LOCATION } from "../api/endpoints";

const locationService = {
  getStates: async () => {
    const response = await api.get(LOCATION.STATES);
    return response;
  },

  getCitiesByState: async (state) => {
    const response = await api.get(LOCATION.CITIES, { params: { state } });
    return response;
  },

  getByPincode: async (pincode) => {
    const response = await api.get(LOCATION.PINCODE(pincode));
    return response;
  },
};

export default locationService;
