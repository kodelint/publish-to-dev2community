// Global test setup
beforeEach(() => {
  // Clear environment variables
  delete process.env.INPUT_API_KEY;
  delete process.env.INPUT_POSTS_DIRECTORY;
  delete process.env.INPUT_PUBLISHED;
  delete process.env.INPUT_DRY_RUN;
});

afterEach(() => {
  // Reset all mocks after each test
  jest.clearAllMocks();
});
