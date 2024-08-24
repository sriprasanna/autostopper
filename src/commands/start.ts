import { GluegunCommand } from 'gluegun';
import { EC2Client, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { notify } from 'node-notifier'


const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
};

const stopInstances = async (client: EC2Client, instanceIds: string[], print: any) => {
  const stopCommand = new StopInstancesCommand({ InstanceIds: instanceIds });
  try {
    await client.send(stopCommand);
    print.info(`Stopped instances: ${instanceIds}`);
  } catch (e) {
    print.error(`Failed to stop instances: ${e}`);
  }
};

const command: GluegunCommand = {
  name: 'start',
  description: 'Starts the instances and automatically shuts them down based on the input provided. Ex: autostopper start i-abc,i-def,i-xyz',
  run: async (toolbox) => {
    const { print, parameters, prompt } = toolbox;
    const instanceIds = parameters.array;
    const inputs = await prompt.ask({
      type: 'input',
      name: 'duration',
      message: "How many minutes to run the instance(s)? Ex: 60, 120, 180"
    });
    const minutes = parseInt(inputs.duration);
    const client = new EC2Client();
    const startCommand = new StartInstancesCommand({ "InstanceIds": instanceIds });

    try {
      await client.send(startCommand);
      print.info(`Starting instances: ${instanceIds}`);
      print.info(`Will automatically shutdown in ${minutes} minute(s)`);
      print.info(`Press ctrl+c to add or remove time, or to stop the servers immediately.`);
      const notifyBeforeShutdown = 300000 // notify 5 mins before shutdown
      let remainingMilliseconds = minutes * 60 * 1000;
      let isRunning = true;
      let notified = false;

      const spinner = print.spin(`Time remaining: ${formatTime(remainingMilliseconds)}`);

      const interval = setInterval(async () => {
        if (!isRunning) return;

        remainingMilliseconds -= 1000;

        // Notify the user 5 minutes before shutdown
        if (remainingMilliseconds <= notifyBeforeShutdown && !notified) {
          notify({
            title: 'Shutdown Warning',
            message: 'The instances will shut down in 5 minutes.',
          });
          notified = true;
        }

        if (remainingMilliseconds <= 0) {
          clearInterval(interval);
          spinner.succeed('Stopping instances');
          await stopInstances(client, instanceIds, print);
          process.exit(0);
        } else {
          spinner.text = `Time remaining: ${formatTime(remainingMilliseconds)}`;
        }
      }, 1000);

      const start = () => {
        spinner.start(`Time remaining: ${formatTime(remainingMilliseconds)}`)
        isRunning = true
      }

      // Handle user input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', async (key) => {
        if (key.toString() === '\u0003') { // CTRL+C
          spinner.stop(); // Stop the spinner to prevent terminal issues
          isRunning = false;

          const action = await prompt.ask({
            type: 'select',
            name: 'choice',
            message: 'What would you like to do?',
            choices: ['Add Time', 'Remove Time', 'Continue', 'Stop'],
          });

          if (action.choice === 'Add Time') {
            const addTimeInput = await prompt.ask({
              type: 'input',
              name: 'addMinutes',
              message: 'How many minutes would you like to add?',
              validate: (value) => isNaN(parseInt(value)) || parseInt(value) <= 0 ? 'Please enter a valid number of minutes.' : true,
            });

            const addMinutes = parseInt(addTimeInput.addMinutes, 10);
            remainingMilliseconds += addMinutes * 60000;
            if (remainingMilliseconds < notifyBeforeShutdown) {
              notified = false;
            }
            print.info(`Added time! Time remaining: ${formatTime(remainingMilliseconds)}`);

          } else if (action.choice === 'Remove Time') {
            const removeTimeInput = await prompt.ask({
              type: 'input',
              name: 'removeMinutes',
              message: 'How many minutes would you like to remove?',
              validate: (value) => isNaN(parseInt(value)) || parseInt(value) <= 0 ? 'Please enter a valid number of minutes.' : true,
            });

            const removeMinutes = parseInt(removeTimeInput.removeMinutes, 10);
            remainingMilliseconds -= removeMinutes * 60000;
            print.info(`Removed time! Time remaining: ${formatTime(remainingMilliseconds)}`);

          } else if (action.choice === 'Continue') {
            // do nothing
          } else if (action.choice === 'Stop') {
            remainingMilliseconds = 0
          }
          start()
        }
      });

    } catch (e) {
      print.error(e);
      process.exit(1);
    }
  },
};

module.exports = command;
