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

PluginManager.registerButtonListener({
  onButtonPress(event) {
    if (event.id === SIDEBAR_BUTTON_ID || event.id === LASSO_BUTTON_ID) {
      session.bump(event.id);
    }
  },
});
