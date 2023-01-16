import { Client } from 'discord.js';

export default (client: Client): void => {
    // Same code as above
    client.on('messageReactionAdd', (reaction: any, user: any) => {
        // console.log('REACTION', reaction);
        let message = reaction.message,
            emoji = reaction.emoji;

        // if (emoji.name == '✅') {
        //     // We don't have the member, but only the user...
        //     // Thanks to the previous part, we know how to fetch it
        //     message.guild.fetchMember(user.id).then(member => {
        //         member.addRole('role_id');
        //     });
        // } else if (emoji.name == '❎') {
        //     message.guild.fetchMember(user.id).then(member => {
        //         member.removeRole('role_id');
        //     });
        // }

        // Remove the user's reaction
        // reaction.remove(user);
    });
};
