/**
 * Created with JetBrains PhpStorm.
 * User: julisman
 * Date: 1/8/14
 * Time: 3:18 PM
 * To change this template use File | Settings | File Templates.
 */

require.config({
    urlArgs: '_t=' + (+new Date()),
    paths: {}
});

require([
    './app'

],function(){
    document.addEventListener("deviceready", onDeviceReady, false);

    function onDeviceReady(){
        angular.element(document).ready(function(){
			// bootstrapping angular module
            angular.bootstrap(document, ['Chatslokomedia']);
        });
    }
	
});