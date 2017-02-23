var isNode = require('../isNode');
var triggerHook = require('../plugins').trigger;
var resolver = require('../resolver');

function getFromNodeModules(name) {
    if (!isNode){
        return;
    }
  // In order to stop webpack and browserify from requiring every possible file, we have to wrap the require statement in an eval
    try{
        var result = eval('require.main.require(name)');
        this.register.constant(name, result);
        return this.$$factories[name];
    }catch(e){
        if (!(e && e.message && e.message.substr(0, 6) === 'Cannot')){
            throw e;
        }
    }
}
function namedParameters(keys, values, args) {
    if (!args || typeof args !== 'object'){
        args = {};
    }

    var i = 0;
    if (keys && values){
        keys.forEach(function (key) {
            if (typeof key === 'object'){
                Object.keys(key).forEach(function (key) {
                    if (args[key] === undefined && values[i] !== undefined){
                        args[key] = values[i];
                    }
                    i++;
                });
            }else{
                if (args[key] === undefined && values[i] !== undefined){
                    args[key] = values[i];
                }
                i++;
            }
        });
    }

    return args;
}

function invokeParent(instance, values, args) {
    if (values && !Array.isArray(values)){
        values = Array.prototype.slice.call(values);
    }
    args = this.$$namedParameters(values, args);
    var Parent = this.$$parent;
    Parent.call(instance, args);
}

function resolve(name, namedParameters) {
  return Array.isArray(name) ?
    resolver.resolveDependencies(this, {dependencies : name}, namedParameters) :
    resolver.resolve(this, name, namedParameters);
}

function clearCache(names) {
  names = names ? [].concat(names) : [];

  for (var key in this.$$factories){
    if (!names.length || names.indexOf(key) > -1){
      this.$$factories[key].resolved = false;
    }
  }
  for (var key in this.$$resolved){
    if (!names.length || names.indexOf(key) > -1){
      delete this.$$resolved[key];
    }
  }
}

module.exports = function (Parent, Class, options) {
    Object.defineProperties(Class, {
      // These are all publically documented methods that can be called from the top level
      $trigger : {
        value : triggerHook
      },
      $resolve : {
        value : resolve
      },
      $clearCache : {
        value : clearCache
      },

      // Called from within the Jpex constructor/resolver
      $$getFromNodeModules : {
        value : getFromNodeModules
      },
      $$namedParameters : {
        value : namedParameters.bind(null, options.dependencies)
      },
      $$invokeParent : {
        value : invokeParent
      },
      $$parent : {
        value : Parent
      },
      // Properties that contain stored factories/settings
      $$factories : {
        writable : true,
        value : Object.create(Parent.$$factories || null)
      },
      $$resolved : {
        writable : true,
        value : Object.create(Parent.$$interfaces || null)
      },
      $$config : {
        writable : true,
        value : Object.assign(Object.create(Parent.$$config || null), options.config)
      },
      $$hooks : {
        writable : true,
        value : Object.create(Parent.$$hooks || null)
      }
    });

  // PRIVATES HOOK
    Class.$trigger('privateProperties', {
        Class : Class,
        options : options,
        apply : function (opt) {
            var properties = {};
            Object.keys(opt).forEach(function (key) {
                var prop = { configurable : false, enumerable : false };
                var def = opt[key];
                if (def && def.get && typeof def.get === 'function'){
                    prop.get = def.get;
                }
                if (def && def.set && typeof def.set === 'function'){
                    prop.set = def.set;
                }
                if (!prop.get && !prop.set){
                    prop.value = def;
                    prop.writable = true;
                }
                properties[key] = prop;
            });

            Object.defineProperties(Class, properties);
        }
    });
};
