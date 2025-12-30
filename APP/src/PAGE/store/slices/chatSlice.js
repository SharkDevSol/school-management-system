import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    contacts: {
      director: [],
      teacher: [],
      guardian: [],
      admin: []
    },
    requests: {},
    currentChat: null
  },
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
      // Avoid duplicates
      const exists = state.requests[userId].find(req => req.id === request.id);
      if (!exists) {
        state.requests[userId].push(request);
        // Sort by creation date
        state.requests[userId].sort((a, b) => 
          new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
        );
      }
    },
    setCurrentChat: (state, action) => {
      state.currentChat = action.payload;
    },
    updateRequestStatus: (state, action) => {
      const { requestId, status } = action.payload;
      Object.keys(state.requests).forEach(userId => {
        state.requests[userId] = state.requests[userId].map(req => 
          req.id === requestId ? { ...req, status } : req
        );
      });
    }
  }
});

// Memoized selectors to prevent unnecessary re-renders
export const selectContactsByRole = createSelector(
  [
    (state) => state.chat.contacts,
    (state, role) => role
  ],
  (contacts, role) => contacts[role] || []
);

export const selectRequestsByUser = createSelector(
  [
    (state) => state.chat.requests,
    (state, userId) => userId
  ],
  (requests, userId) => requests[userId] || []
);

export const { setContacts, addRequest, setCurrentChat, updateRequestStatus } = chatSlice.actions;
export default chatSlice.reducer;