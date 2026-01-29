// This mock is overridden in the test file
export const postgraphile = jest.fn(() => ({
  createServ: jest.fn(() => ({
    addTo: jest.fn(() => Promise.resolve()),
  })),
}));
