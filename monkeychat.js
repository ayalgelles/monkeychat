var Fiber = Npm.require('fibers');

Meteor.methods({
    sendchat: function (data) {
	console.log('\n\n\n------------ incoming...',data);
	if (this.isSimulation) {
	    
	}
	else {
	    if (this.userId) {
		var user = Meteor.users.findOne({_id: this.userId});
		if (user &&
		    user.services &&
		    user.services.facebook &&
		    user.services.facebook.id) {
		    data.fbid = user.services.facebook.id;
		    data.accessToken = user.services.facebook.accessToken;
		    data.appId = Accounts.loginServiceConfiguration.find().fetch()[0].appId
		}
	    }

	    try {
		Fiber(function () {
		    chat(data);
		}).run();
	    }
	    catch(x) {
		console.log('exception when sending chat', x);
	    }
	}
    }
});

var Messages = new Meteor.Collection('messages');

if (Meteor.isClient) {

    Meteor.startup(function(){
	Meteor.subscribe("users");
	Meteor.subscribe("messages");
    });

    Template.loginButtox.events({
	'click button': function(){
	    Meteor.loginWithFacebook({
		requestPermissions: ['email','xmpp_login']
	    }, function (err) {
		if (err)
		    Session.set('errorMessage', err.reason || 'Unknown error');
	    });
	}
    });
    Template.chat.messages = function(){
	return Messages.find({});
    };
    
    Template.chat.events({
	'keypress input' : function (e) {
	    if (!Meteor.user()) {
		alert('LOGIN!');
	    }

	    if (e.keyCode === 13) {
		var data = {msg: $(e.target).val(), from: Meteor.user().services.facebook.id, to: '100001121235309'};
		$(e.target).val('');
		console.log(data);
		Messages.insert(data);
		Meteor.call('sendchat', data);
	    }
	}
    });
}


if (Meteor.isServer) {
    
    var argv = process.argv; 
    
    hash = {};

    var chat = function(data) {
	
        var xmppinfo = { jid: '-' + data.fbid + '@chat.facebook.com', 
			 api_key: data.appId, 
			 access_token: data.accessToken,
			 host: 'chat.facebook.com' };

	console.log('xmpp info', xmppinfo);

	var cl = hash[data.fbid] || new xmpp.Client(xmppinfo); 
	hash[data.fbid] = cl;

	cl.addListener('error', 
		       function(e) {
			   console.log('ERROR >>>>>>>>>>>>>>>' + e);
		       });	


//	cl.addListener('online',  function() { 
	setTimeout(function(){
	    console.log('ONLINE!');
	    
	    console.log("sending", data.msg, "to", data.to + '\n\n');

	    try {
		cl.send(new xmpp.Element('message', 
				     { to: '-' + data.to + '@chat.facebook.com',
				       type: 'chat'}).                                                                                                                             
			c('body'). 
			t(data.msg));    
	    }
	    catch (x) {
		console.log('ERROR WHILE SENDING >>>>>>>>>>>>>>>>>>>>>>>', x);
	    }
	    finally {
		closetime = setTimeout(function(){
		    console.log('------------------ closing connection\n\n');
		    hash[data.fbid] = null;
		    cl.end();
		},5000);
	    }

	},3000);
    };
    

    Meteor.publish("users", function() {
	console.log('publishing', this.userId);
	return Meteor.users.find({_id : this.userId});
    });

    Meteor.publish("messages", function() {
	return Messages.find();
    });

    Meteor.startup(function () {
	console.log('startup')
	Accounts.loginServiceConfiguration.remove({});                                                                                                                                  
        
        Accounts.loginServiceConfiguration.insert({                                                                                                                                     
            service: "facebook",                                                                                                                                                          
            appId: "453582378051001",                                                                                                                                                     
            secret: "30377c70afaa8b1af011fa62e3c64277"                                                                                                                                    
        }); 
    });
}