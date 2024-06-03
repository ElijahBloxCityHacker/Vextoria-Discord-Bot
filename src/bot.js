const { Client } = require('discord.js');
const { createPool } = require('mysql');
const config = require('../config.json');

const client = new Client();
const db = new createPool({
    connectTimeout: 60 * 60 * 1000,
    acquireTimeout: 60 * 60 * 1000,
    timeout: 60 * 60 * 1000,
    host: config.db_host,
    database: config.db_name,
    user: config.db_user,
    password: config.db_pass
});

client.on('ready', () => {
    console.log('Bot is online');
    
    client.user.setActivity('Send me your verification code!', {
        type: 'CUSTOM_STATUS'
    }).then((presence) => console.log(`Activity set to ${presence.activities[0].name}`));
});

client.on('message', async (message) => {
    if (message.author.equals(client.user) || message.channel.type != 'dm') return;
    
    db.query('SELECT * FROM users', async (error, results) => {
        if (error) {
            message.channel.send('Unable to verify. Please try again.');
            throw error;
        }
        
        const data = results.map((child) => child.discord_code).indexOf(message.content);
        
        if (data > -1) {
            const user = results[data];
            var donated = false;
            
            db.query(`UPDATE users SET discord_id = ${message.author.id} WHERE id = ${user.id}`, (error) => {
                if (error)
                    throw error;
            });
            
            db.query('SELECT * FROM purchases', (error, results) => {
                if (error)
                    throw error;
                
                donated = results.map((child) => child.user_id).indexOf(user.id) > 1;
            });
            
            await client.guilds.cache.get(config.server_id).members.fetch(message.author.id);
            client.guilds.cache.get(config.server_id).members.cache.get(message.author.id).roles.add(config.role_ids.verified);
            client.guilds.cache.get(config.server_id).members.cache.get(message.author.id).setNickname(user.username);
            
            if (user.membership_until && typeof config.role_ids.membership !== 'undefined' && config.role_ids.membership)
                client.guilds.cache.get(config.server_id).members.cache.get(message.author.id).roles.add(config.role_ids.membership);
            
            if (donated && typeof config.role_ids.donator !== 'undefined' && config.role_ids.donator)
                client.guilds.cache.get(config.server_id).members.cache.get(message.author.id).roles.add(config.role_ids.donator);
            
            message.channel.send(`You have successfully verified, ${user.username}. You now have the ability to chat in the ${config.server_name} server!`);
        }
    });
});

client.login(config.token);