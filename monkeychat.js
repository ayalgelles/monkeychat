Meteor.methods({
    sendchat: function (data) {
	console.log(data);
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
		chat(data);
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
    var require = __meteor_bootstrap__.require,
    xmpp = require('node-xmpp');   
  
    var argv = process.argv; 
    
    var channels = {};

    var myChannel = function(data) {
	console.log('my channel', data);
	var cl = channels['channel_' + data.fbid];
	if (!cl) {
            var xmppinfo = { jid: '-' + data.fbid + '@chat.facebook.com', 
			     api_key: data.appId, 
			     access_token: data.accessToken,
			     host: 'chat.facebook.com' };

	    console.log('from scratch', xmppinfo);
	    channels['channel_' + data.fbid] = 
		cl =
		new xmpp.Client(xmppinfo); 
	    
/*	    cl.on('stanza',
		  function(stanza) {
		      if (stanza.is('message') &&
			  // Important: never reply to errors!
			  stanza.attrs.type !== 'error') {
			  var message = stanza.getChild('body') && stanza.getChild('body').getText();
			  try {
			      if (message) {
				  var from = stanza.attrs.from.match(/-(\d+)@/)[1]
				  var to = stanza.attrs.to.match(/-(\d+)@/)[1]
				  
				  console.log('message >>> ', from, to, message);
				  var data = {msg: message, from: from, to: to};
				  Fiber(function () {
				      Messages.insert(data);
				  }).run();
			      }
			  }
			  catch (x) {
			      
			  }
		      }
		  });*/
	    
	    cl.addListener('error', 
			   function(e) {
			       console.error(e);
			       process.exit(1);                                                                                                                                                       
			   });
	    
	    
	    cl.ready = function(cb) {
		if (cl.__ready) {
		    cb();
		    return;
		}

		cl.addListener('online', 
			       function() { 
				   console.log('ONLINE!');
				   cl.__ready = true;
				   cb();
			       });
		
	    };
	}
	else {
	    console.log('already inited');
	}
	
	return cl;
	

    };

    var chat = function(data) {
	var cl = myChannel(data);
	cl.ready(function() {
	    console.log("sending", data.msg, "to", data.to);
	    cl.send(new xmpp.Element('message', 
				     { to: '-' + data.to + '@chat.facebook.com',                                                                                                   
				       type: 'chat'}).                                                                                                                             
		    c('body'). 
		    t(data.msg));                                                                                                           
	});
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