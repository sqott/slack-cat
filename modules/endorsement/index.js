'use strict';

const userPattern = new RegExp(/\<@([^\s|\<]+)\>/, 'g');

module.exports = class Endorsements extends BaseStorageModule {


  async handle(data) {
    if (data.cmd.includes('endorsements')) {
      const msg = await this.handleEndorsements(data);
      this.bot.postMessageToThread(
        data.channel,
        msg || 'You forgot to give me a person',
        data.ts
      );
      return;
    }

    if (!data.user_text) {
      this.bot.postMessage(data.channel, this.help())
      return;
    }


    const error = await this.endorseUser(data);
    if (!error) {
      this.bot.postMessage(
        data.channel,
        `You forgot to tell me who to endorse!\n${this.help()}`
      );
      return;
    }

    this.bot.postMessage(data.channel, "Endorsed!");
  }

  async handleEndorsements(data) {
    let group = userPattern.exec(data.user_text);
    if (!group) {
      return false;
    }

    const displayName = await this.bot.getUserNameDisplayNameFromId(group[1])

    const endorsementRows = await this.findAll(group[1]);
    const usersEndorsements = endorsementRows.map(endorsement => {
      return endorsement.get('endorsement')
    });

    return `*${displayName}* has been endorsed for:\n${usersEndorsements.join("; ")}`;
  }

  async endorseUser(data) {
    let group = userPattern.exec(data.user_text);
    if (!group) {
      return false;
    }

    const userArray = [];
    let sanitizedEndorsement = data.user_text
    while (group) {
      userArray.push(group[1]);
      sanitizedEndorsement = sanitizedEndorsement.replace(group[0], '');
      // Loop
      group = userPattern.exec(data.user_text)
    }

    userArray.map(async user => {
      await this.add(user, sanitizedEndorsement.trim(), data.user);
    });

    return true;
  }

  async add(userId, endorsement, endorserId) {
    return await this.Endorsements.create({
      userId: userId,
      endorsement: endorsement,
      endorserId: endorserId
    });
  }

  async findAll(userId) {
    return await this.Endorsements.findAll({
      where: {
        userId: userId,
      },
    });
  }


  help() {
    return 'Endorse ppl for doing cool stuff! Usage:\n?endorse @username for doing kewl stuff.';
  }

  registerSqliteModel() {
    this.Endorsements = this.db.define('endorsements', {
      userId: { type: this.Sequelize.STRING, primaryKey: true },
      endorsement: { type: this.Sequelize.STRING, primaryKey: true }, // Don't dupe endorsements.
      endorserId: this.Sequelize.STRING
    });
  }

  aliases() {
    return ['endorse', 'endorsements'];
  }

  getType() {
    return [BaseModule.TYPES.MODULE];
  }
};