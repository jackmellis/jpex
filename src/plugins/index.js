exports.use = function (plugin) {
    var Jpex = this;

    if (!plugin || !plugin.install || typeof plugin.install !== 'function'){
        throw new Error('Plugin does not have an install method');
    }

    var options = {
        Jpex : Jpex,
        on : function (name, fn) {
            addHook(Jpex, name, fn);
        }
    };

    plugin.install(options);
};

exports.trigger = function (name, payload) {
    var hook = this.$$hooks[name];
    if (!hook){
        return;
    }

    hook.trigger(payload);
};

function addHook(Class, name, fn) {
    var hooks = Class.$$hooks;

    if (!hooks[name]){
        var id = 0;
        var Parent = Class;
        while (Parent.$$parent && Parent.$$parent.$$parent){
            Parent = Parent.$$parent;
        }
        Parent.$$hooks[name] = Object.create({
            push : function (fn) {
                this[id++] = fn;
            },
            trigger : function (payload) {
                payload = Object.assign({ Jpex : Class, eventName : name }, payload);
                Array.prototype.slice.call(this).forEach(function (fn) {
                    fn(payload);
                });
            }
        }, {
            length : {
                get : function () {
                    return id;
                }
            }
        });
    }
    if (!Object.hasOwnProperty.call(hooks, name)){
        hooks[name] = Object.create(Class.$$parent.$$hooks[name] || null);
    }
    hooks[name].push(fn);
}