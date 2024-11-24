const express = require('express');
const fs = require('fs');
const path = require('path');

const tf = require('@tensorflow/tfjs-node');
const handPoseDetection = require('@tensorflow-models/hand-pose-detection');
const { MediaPipeHands } = handPoseDetection.SupportedModels;

const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const { createCanvas, loadImage } = canvas;
const Jimp = require('jimp');

const https = require('https');
const key = fs.readFileSync(path.join(__dirname, 'server.key'));
const cert = fs.readFileSync(path.join(__dirname, 'server.cert'));

const app = express();
const port = 3000;

const framesDir = path.join(__dirname, 'frames');
const processedDir = path.join(__dirname, 'processed');

let faceDetector = null;

// Monkey patch do ambiente
faceapi.env.monkeyPatch({
    Canvas: canvas.Canvas,
    Image: canvas.Image,
    ImageData: canvas.ImageData
});

async function initializeFaceApi() {
    const modelPath = path.join(__dirname, 'models'); // Diretório onde os modelos estão armazenados
    console.log(`Carregando modelos do caminho: ${modelPath}`);

    try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath); // Modelo de detecção de rosto
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath); // Modelo de landmarks faciais
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath); // Modelo de reconhecimento facial

        console.log('Modelos de rosto carregados com sucesso.');
    } catch (error) {
        console.error('Erro ao carregar modelos ou inicializar o face-api.js:', error);
        // throw error; // Propaga o erro para evitar que o sistema continue sem os modelos
    }
}

initializeFaceApi();

// Tornar os arquivos estáticos acessíveis
app.use('/processed', express.static(processedDir));

// Endpoint para listar frames processados
app.get('/processed-frames', (req, res) => {
    fs.readdir(processedDir, (err, files) => {
        if (err) {
            console.error('Erro ao listar arquivos processados:', err);
            return res.status(500).json({ message: 'Erro ao listar frames processados.' });
        }
        res.json(files); // Retorna a lista de arquivos processados
    });
});

// Criação das pastas necessárias
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(processedDir, { recursive: true });

let sessionFrames = [];
let detectedMovements = [];

app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
app.use('/frames', express.static(framesDir));
app.use('/processed', express.static(processedDir));

let handposeModel = null;

// Inicializar modelos de mão e rosto
(async () => {
    try {
        await tf.ready();
        await tf.setBackend('cpu');
        console.log("TensorFlow está usando o backend:", tf.getBackend());

        handposeModel = await handPoseDetection.createDetector(MediaPipeHands, {
            runtime: 'tfjs',
            modelType: 'full'
        });

        await faceapi.nets.ssdMobilenetv1.loadFromDisk(path.join(__dirname, 'models')); // Carregar modelo de detecção
        await faceapi.nets.faceLandmark68Net.loadFromDisk(path.join(__dirname, 'models')); // Carregar landmarks
        console.log('Modelos de mãos e rosto carregados com sucesso.');
    } catch (error) {
        console.error("Erro ao inicializar TensorFlow ou carregar modelos:", error);
    }
})();

// Função para detectar movimento e processar os frames
async function detectMovement(frames) {
    console.log('Detectando movimento...');

    if (!handposeModel) {
        console.error('Modelo de detecção de mãos não carregado.');
        throw new Error('Modelo de detecção de mãos não carregado.');
    }

    let movementDetected = false;

    for (const framePath of frames) {
        try {
            console.log(`Processando o frame: ${framePath}`);

            // Garantir backend "tensorflow" para decodificar imagens
            if (tf.getBackend() !== 'tensorflow') {
                await tf.setBackend('tensorflow');
                await tf.ready();
            }

            // Ler a imagem e convertê-la em canvas
            const image = await Jimp.read(framePath);
            const canvasImg = createCanvas(image.bitmap.width, image.bitmap.height);
            const ctx = canvasImg.getContext('2d');
            ctx.drawImage(await loadImage(framePath), 0, 0);

            // Garantir backend "cpu" para usar os modelos
            if (tf.getBackend() !== 'cpu') {
                await tf.setBackend('cpu');
                await tf.ready();
            }

            // Detectar mãos no frame
            let hands = [];
            try {
                hands = await handposeModel.estimateHands(tf.browser.fromPixels(canvasImg));
            } catch (handError) {
                console.warn(`Erro ao detectar mãos no frame: ${framePath}`, handError);
            }

            // Detectar rostos no frame usando face-api.js
            let faces = [];
            try {
                faces = await faceapi.detectAllFaces(canvasImg)
                    .withFaceLandmarks();
            } catch (faceError) {
                console.warn(`Erro ao detectar rostos no frame: ${framePath}`, faceError);
            }

            // Processar mãos e rostos
            if (hands.length > 0 && faces.length > 0) {
                // **Adicionar lógica para verificar se a mão está próxima ao rosto**

                // Usar a primeira mão e o primeiro rosto detectados (você pode adaptar para múltiplos)
                const hand = hands[0];
                const face = faces[0];

                // Pontos-chave da mão (por exemplo, ponta do dedo indicador)
                const fingerTip = hand.keypoints.find(kp => kp.name === 'index_finger_tip');

                if (!fingerTip) {
                    console.warn('Ponta do dedo indicador não encontrada.');
                    continue;
                }

                // Pontos-chave do rosto (por exemplo, ponta do nariz)
                const noseTip = face.landmarks.positions.find(pos => pos._label === 'nose');

                if (!noseTip) {
                    console.warn('Ponta do nariz não encontrada.');
                    continue;
                }

                // Calcular a distância euclidiana entre a ponta do dedo e a ponta do nariz
                const dx = fingerTip.x - noseTip.x;
                const dy = fingerTip.y - noseTip.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Definir um limite para considerar como "mão no rosto"
                const threshold = 50; // Este valor pode precisar de ajustes

                if (distance < threshold) {
                    console.log('Mão próxima ao rosto detectada!');
                    movementDetected = true;

                    // Aqui você pode adicionar código para ações adicionais, como salvar uma notificação, etc.
                } else {
                    console.log('Mão longe do rosto.');
                }
            } else {
                console.log(`Nenhuma mão ou rosto detectado no frame: ${framePath}`);
            }

            // (Opcional) Prosseguir para desenhar os pontos no frame, se desejar
            // ...

        } catch (error) {
            console.error(`Erro ao processar o frame ${framePath}:`, error);
        }
    }

    return movementDetected;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/results', (req, res) => {
    res.json({ movements: detectedMovements });
});

app.post('/frame', async (req, res) => {
    if (!req.body || req.body.length === 0) {
        console.error('Erro: Corpo da requisição vazio.');
        return res.status(400).json({ message: 'Frame não fornecido.' });
    }

    const { isLastFrame } = req.query;
    const timestamp = Date.now();
    const framePath = path.join(framesDir, `frame-${timestamp}.jpg`);

    fs.writeFile(framePath, req.body, async (err) => {
        if (err) {
            console.error('Erro ao salvar frame:', err);
            return res.status(500).json({ message: 'Erro ao salvar frame.' });
        }

        sessionFrames.push(framePath);
        console.log(`Frame salvo: ${framePath}`);

        if (isLastFrame === 'true') {
            try {
                const movementDetected = await detectMovement(sessionFrames);
                detectedMovements.push({ timestamp: new Date(), movementDetected });
                sessionFrames = [];

                res.status(200).json({ message: 'Sessão completa!', movementDetected });
            } catch (error) {
                console.error('Erro ao processar frames:', error);
                res.status(500).json({ message: 'Erro ao processar frames.', error: error.message });
            }
        } else {
            res.status(200).json({ message: 'Frame recebido.' });
        }
    });
});

https.createServer({ key, cert }, app).listen(port, () => {
    console.log(`Servidor rodando em https://localhost:${port}`);
});
