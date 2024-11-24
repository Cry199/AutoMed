const express = require('express');
const fs = require('fs');
const path = require('path');

const tf = require('@tensorflow/tfjs-node'); // Importando o TensorFlow.js no backend Node.js
const handpose = require('@tensorflow-models/handpose');
const faceapi = require('@vladmandic/face-api');
const Jimp = require('jimp');

const https = require('https');
const key = fs.readFileSync(path.join(__dirname, 'server.key'));
const cert = fs.readFileSync(path.join(__dirname, 'server.cert'));

const app = express();
const port = 3000;

const { createCanvas, loadImage } = require('canvas');
const processedPath = framePath.replace('frames', 'processed');


const framesDir = path.join(__dirname, 'frames');
fs.mkdirSync(framesDir, { recursive: true });

let sessionFrames = [];
let detectedMovements = [];

app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
app.use('/frames', express.static(framesDir));

app.use('/processed', express.static(path.join(__dirname, 'processed')));


let handposeModel = null;

(async () => {
    try {
        await tf.ready();
        await tf.setBackend('cpu'); // Usando o backend CPU para suporte ao modelo Handpose
        console.log("TensorFlow está usando o backend:", tf.getBackend());

        // Carregando modelos necessários
        const modelPath = path.join(__dirname, 'models');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        handposeModel = await handpose.load();
        console.log('Modelos carregados com sucesso.');
    } catch (error) {
        console.error("Erro ao inicializar TensorFlow ou carregar modelos:", error);
    }
})();

async function detectMovement(frames) {
    console.log('Detectando movimento...');

    if (!handposeModel) {
        console.error('Modelo Handpose não carregado.');
        throw new Error('Modelo Handpose não carregado.');
    }

    let lastHandPosition = null;
    let movementDetected = false;

    for (const framePath of frames) {
        try {
            // Certifique-se de usar o backend TensorFlow para decodificar imagens
            if (tf.getBackend() !== 'tensorflow') {
                await tf.setBackend('tensorflow');
                await tf.ready();
            }

            // Leitura e conversão da imagem usando Jimp
            const image = await Jimp.read(framePath);
            const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
            const imageTensor = tf.node.decodeImage(buffer, 3);

            // Altere para o backend CPU para executar o modelo Handpose
            if (tf.getBackend() !== 'cpu') {
                await tf.setBackend('cpu');
                await tf.ready();
            }

            // Estimar mãos no frame
            const hands = await handposeModel.estimateHands(imageTensor);

            // Volte ao backend TensorFlow para outras operações
            await tf.setBackend('tensorflow');
            await tf.ready();

            // Continuar o processamento se mãos forem detectadas
            if (hands.length > 0) {
                const hand = hands[0];
                const handPosition = hand.landmarks[0]; // Coordenadas do primeiro ponto da mão

                // Criar um canvas para desenhar a imagem e as marcações
                const canvas = createCanvas(image.bitmap.width, image.bitmap.height);
                const ctx = canvas.getContext('2d');

                // Carregar a imagem original no canvas
                const img = await loadImage(framePath);
                ctx.drawImage(img, 0, 0);

                // Configurar estilos de desenho
                ctx.fillStyle = 'blue'; // Cor para os pontos
                ctx.strokeStyle = 'white'; // Cor para as conexões
                ctx.lineWidth = 2;

                // Desenhar os pontos
                hand.landmarks.forEach(([x, y]) => {
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2); // Raio de 5px
                    ctx.fill();
                });

                // Desenhar as conexões
                const connections = [
                    [0, 1], [1, 2], [2, 3], [3, 4], // Polegar
                    [0, 5], [5, 6], [6, 7], [7, 8], // Indicador
                    [0, 9], [9, 10], [10, 11], [11, 12], // Médio
                    [0, 13], [13, 14], [14, 15], [15, 16], // Anelar
                    [0, 17], [17, 18], [18, 19], [19, 20] // Mínimo
                ];
                connections.forEach(([start, end]) => {
                    const [x1, y1] = hand.landmarks[start];
                    const [x2, y2] = hand.landmarks[end];
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                });

                // Salvar o frame processado
                const processedPath = framePath.replace('frames', 'processed'); // Ex: mover para uma pasta "processed"
                const out = fs.createWriteStream(processedPath);
                const stream = canvas.createJPEGStream();
                stream.pipe(out);

                out.on('finish', () => {
                    console.log(`Frame processado salvo em: ${processedPath}`);
                });

                if (lastHandPosition) {
                    // Calcular a distância entre a posição atual e a última
                    const distance = Math.sqrt(
                        Math.pow(handPosition[0] - lastHandPosition[0], 2) +
                        Math.pow(handPosition[1] - lastHandPosition[1], 2)
                    );

                    // Configurar um critério para considerar movimento
                    if (distance > 10) {
                        console.log('Movimento detectado: Mão movida significativamente.');
                        movementDetected = true;
                        break;
                    }
                }

                lastHandPosition = handPosition;
            }

            // Limpeza do tensor para evitar vazamento de memória
            imageTensor.dispose();
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
