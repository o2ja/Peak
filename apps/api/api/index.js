// Vercel entry: the whole Express app as one serverless function (built to dist by `npm run build`).
import { createApp } from "../dist/app.js";

export default createApp();
