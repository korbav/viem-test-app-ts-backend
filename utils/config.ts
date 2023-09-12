import devConfig from '../config.development.json';
import prodConfig from '../config.production.json';

export default function getConfig(): any {
    switch(process.env.ENV_VARIABLE) {
        case "production": {
            return prodConfig;
        }
        default:
            return devConfig;
    }
} 