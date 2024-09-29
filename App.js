const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const ffmpeg = require('fluent-ffmpeg');
const tf = require('@tensorflow/tfjs'); 
const handpose = require('@tensorflow-models/handpose');
const Jimp = require('jimp');

const app = express();
const port = 3000;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, () => {
    console.log(`App rodando em http://localhost:${port}`);
});

app.get('/', (req, res) => {
    res.send('API rodando');
});

app.post('/video', async (req, res) => {
    const videoData = req.body.video;

    if (!videoData)
        return res.status(400).json({ message: 'Vídeo não fornecido.' });

    const base64Data = videoData.replace(/^data:video\/mp4;base64,/, '');
    const filePath = path.join(__dirname,'video.mp4');

    fs.writeFileSync(filePath, base64Data, 'base64');

    const outputDir = path.join(__dirname, 'frames');
    fs.mkdirSync(outputDir, { recursive: true });

        await extractFrames(filePath, outputDir);

        const results = [];
        for (let i = 1; i <= 5; i++) 
        { 
            const framePath = path.join(outputDir, `frame-${String(i).padStart(3, '0')}.png`);
            const predictions = await detectHandPose(framePath);
            results.push(predictions);
        }

        res.status(200).json({ message: 'Vídeo recebido e frames processados com sucesso!', results });
        console.log('Vídeo recebido e frames processados com sucesso!', results);
  
});

function extractFrames(videoPath, outputDir) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .output(`${outputDir}/frame-%03d.png`)
            .noAudio()
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

async function detectHandPose(framePath) {
    const model = await handpose.load();
    
    const image = await Jimp.read(framePath);
    const imageTensor = tf.browser.fromPixels(image.bitmap);

    const predictions = await model.estimateHands(imageTensor);
    
    return predictions;
}
