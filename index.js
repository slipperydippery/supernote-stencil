/**
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginManager} from 'sn-plugin-lib';
import {LASSO_BUTTON_ID, SIDEBAR_BUTTON_ID} from './src/buttons';
import {session} from './src/session';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

PluginManager.registerButton(1, ['NOTE'], {
  id: SIDEBAR_BUTTON_ID,
  name: 'Stencil',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  expandMenuItem: 0,
  showType: 1,
});

// editDataTypes: 0 strokes, 3 text boxes, 5 geometry (1 titles, 4 links deliberately excluded).
PluginManager.registerButton(2, ['NOTE'], {
  id: LASSO_BUTTON_ID,
  name: 'Stencil',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  enable: true,
  editDataTypes: [0, 3, 5],
});

PluginManager.registerButtonListener({
  onButtonPress(event) {
    if (event.id === SIDEBAR_BUTTON_ID || event.id === LASSO_BUTTON_ID) {
      session.bump(event.id);
    }
  },
});
