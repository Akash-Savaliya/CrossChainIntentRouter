import axios from 'axios';
import { BACKEND_URL } from '../constants/config';

export async function submitIntentToBackend(intentPayload) {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/intents`, intentPayload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || error.message);
  }
}