import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  contacts: {
    director: [],
    guardian: [],
    // Add other roles if needed (e.g., teacher)
  },
  requests: {}, // e.g., { userId: [requests] }
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setContacts: (state, action) => {
      const { role, contacts } = action.payload;
      state.contacts[role] = contacts;
    },
    addRequest: (state, action) => {
      const { userId, request } = action.payload;
      if (!state.requests[userId]) {
        state.requests[userId] = [];
      }
      state.requests[userId].push(request);
    },
    // Add more reducers if your app requires them (e.g., for updating requests)
  },
});

// Selectors (as used in your components)
export const selectContactsByRole = (state, role) => state.chat.contacts[role] || [];
export const selectRequestsByUser = (state, userId) => state.chat.requests[userId] || [];

export const { setContacts, addRequest } = chatSlice.actions;
export default chatSlice.reducer;