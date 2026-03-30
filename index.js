require('dotenv').config();
const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, RoleSelectMenuBuilder, SlashCommandBuilder, 
    REST, Routes 
} = require('discord.js');
const { generateMath } = require('./mathEngine');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

// In-memory database (Note: In production, use MongoDB or SQLite)
const activeDrops = new Map();

client.once('ready', async () => {
    console.log(`🚀 Bot online as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('drop')
            .setDescription('Start an advanced giveaway drop')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash commands registered.');
    } catch (err) {
        console.error(err);
    }
});

client.on('interactionCreate', async (interaction) => {
    // 1. Slash Command
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'drop') {
            const roleMenu = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('setup_role_select')
                    .setPlaceholder('Select the role to ping')
            );
            const embed = new EmbedBuilder()
                .setTitle('🎁 Drop Setup: Step 1')
                .setDescription('Select the **Role** to ping when the drop starts.')
                .setColor(0x5865F2);
            await interaction.reply({ embeds: [embed], components: [roleMenu], ephemeral: true });
        }
    }

    // 2. Role Selection
    if (interaction.isRoleSelectMenu()) {
        if (interaction.customId === 'setup_role_select') {
            const roleId = interaction.values[0];
            const proceedBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_modal_${roleId}`)
                    .setLabel('Continue to Details')
                    .setStyle(ButtonStyle.Primary)
            );
            const embed = new EmbedBuilder()
                .setTitle('🎁 Drop Setup: Step 2')
                .setDescription(`Role: <@&${roleId}>\nClick below to enter item details.`)
                .setColor(0x5865F2);
            await interaction.update({ embeds: [embed], components: [proceedBtn] });
        }
    }

    // 3. Buttons & Modals
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('open_modal_')) {
            const roleId = interaction.customId.replace('open_modal_', '');
            const modal = new ModalBuilder().setCustomId(`drop_modal_${roleId}`).setTitle('Giveaway Details');
            
            const itemInput = new TextInputBuilder().setCustomId('item_name').setLabel("Item Name").setStyle(TextInputStyle.Short).setRequired(true);
            const linkInput = new TextInputBuilder().setCustomId('reward_link').setLabel("Reward Link/Code").setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(itemInput), new ActionRowBuilder().addComponents(linkInput));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'solve_button') {
            const drop = activeDrops.get(interaction.message.id);
            if (!drop || !drop.active) return interaction.reply({ content: "Drop expired.", ephemeral: true });

            const math = generateMath();
            drop.currentQuestion = math.answer;

            const mathModal = new ModalBuilder().setCustomId(`math_answer_${interaction.message.id}`).setTitle('Solve to Win');
            const ansInput = new TextInputBuilder().setCustomId('user_answer').setLabel("Result?").setStyle(TextInputStyle.Short).setRequired(true);
            mathModal.addComponents(new ActionRowBuilder().addComponents(ansInput));
            await interaction.showModal(mathModal);
        }
    }

    if (interaction.isModalSubmit()) {
        // 4. Create the Drop
        if (interaction.customId.startsWith('drop_modal_')) {
            const roleId = interaction.customId.replace('drop_modal_', '');
            const itemName = interaction.fields.getTextInputValue('item_name');
            const rewardLink = interaction.fields.getTextInputValue('reward_link');

            const embed = new EmbedBuilder()
                .setTitle('🎁 NEW DROP STARTED!')
                .setDescription(`**Item:** ${itemName}\n**Ping:** <@&${roleId}>\n\nClick the button below to solve the challenge!`)
                .setColor(0x00FF00);

            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('solve_button').setLabel('Solve to Win').setStyle(ButtonStyle.Success)
            );

            const msg = await interaction.channel.send({ content: `<@&${roleId}>`, embeds: [embed], components: [btn] });
            activeDrops.set(msg.id, { active: true, itemName, rewardLink, currentQuestion: null });
            await interaction.reply({ content: "Drop Live!", ephemeral: true });
        }

        // 5. Validate Answer
        if (interaction.customId.startsWith('math_answer_')) {
            const msgId = interaction.customId.replace('math_answer_', '');
            const userAnswer = interaction.fields.getTextInputValue('user_answer');
            const drop = activeDrops.get(msgId);

            if (!drop || !drop.active) return interaction.reply({ content: "No active drop.", ephemeral: true });

            if (userAnswer === drop.currentQuestion) {
                drop.active = false;
                try {
                    await interaction.user.send(`🎉 You won **${drop.itemName}**!\nReward: ${drop.rewardLink}`);
                    await interaction.reply({ content: `✅ <@${interaction.user.id}> won! Check DMs!`, ephemeral: false });
                } catch {
                    await interaction.reply({ content: `✅ <@${interaction.user.id}> won! (Couldn't DM them)`, ephemeral: false });
                }

                const winEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle('🎁 DROP CLAIMED!')
                    .setDescription(`**Item:** ${drop.itemName}\n**Winner:** <@${interaction.user.id}>`)
                    .setColor(0xFF0000);
                await interaction.message.edit({ embeds: [winEmbed], components: [] });
                activeDrops.delete(msgId);
            } else {
                await interaction.reply({ content: "❌ Wrong! Try again.", ephemeral: true });
            }
        }
    }
});

client.login(process.env.TOKEN);
