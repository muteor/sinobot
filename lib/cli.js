import program from 'commander';
import { version } from '../package.json';
import Config from './config';
import Bot from './bot';
import 'babel-polyfill';

async function run() {
    const banner = "      .__                 ___.              __"
        + "\n" +
        "  ______|__|  ____    ____  \\_ |__    ____  _/  |_"
        + "\n" +
        " /  ___/|  | /    \\  /  _ \\  | __ \\  /  _ \\ \\   __\\"
        + "\n" +
        " \\___ \\ |  ||   |  \\(  <_> ) | \\_\\ \\(  <_> ) |  |"
        + "\n" +
        "/____  >|__||___|  / \\____/  |___  / \\____/  |__|"
        + "\n" +
        "     \\/          \\/              \\/"
        + "\n" +
        "Sinobot does things for you and keeps logs..."

    program
        .version(version)
        .description(banner)
        .option(
            '-c, --config <path>',
            'Sets the path to the config file'
        )
        .option(
            '-v, --verbose <level>',
            'Sets the logging level (0-5)'
        )
        .parse(process.argv);

    if (!program.config) {
        program.outputHelp();
        return;
    }

    const config = new Config(program.config, program.verbose);
    const bot = new Bot(config);
    bot.start();
}

export default run;