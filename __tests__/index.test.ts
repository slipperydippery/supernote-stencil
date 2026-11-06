const mockRegisterButton = jest.fn();

jest.mock('../App', () => ({ __esModule: true, default: () => null }));
jest.mock('sn-plugin-lib', () => ({
  PluginManager: {
    init: jest.fn(),
    registerButton: mockRegisterButton,
    registerButtonListener: jest.fn(),
  },
}));

it('registers one lasso button for strokes, text boxes and geometry', () => {
  jest.isolateModules(() => {
    require('../index.js');
  });
  expect(mockRegisterButton).toHaveBeenCalledTimes(2);
  const [type, scope, payload] = mockRegisterButton.mock.calls[1];
  expect(type).toBe(2);
  expect(scope).toEqual(['NOTE']);
  expect(payload).toMatchObject({ id: 400, name: 'Stencil', enable: true, editDataTypes: [0, 3, 5] });
});
