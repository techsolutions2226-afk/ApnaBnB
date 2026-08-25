import apiClient from '../api/apiClient';

const aiService = {
  /* Ask the server to write a description from the fields the user has filled
     so far. `kind` is 'listing' or 'requirement'; `fields` is a flat object of
     whatever the form currently holds — the server prunes empty values and
     refuses (422) if there is not enough to work from. */
  writeDescription: async (kind, fields) => {
    try {
      /* apiClient defaults to a 10s timeout, but the server allows Gemini 15s
         plus one retry (~31s worst case) — so the browser was aborting requests
         the server would have completed. Give this call the longer budget. */
      const response = await apiClient.post('/ai/description', { kind, ...fields }, {
        timeout: 35000,
      });
      return response.data.description;
    } catch (error) {
      throw error.response?.data || { message: 'Could not generate a description' };
    }
  },
};

export default aiService;
