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

const http = require('http');
const https = require('https');

const app = express();
const PORT_HTTP = 3000;
const PORT_HTTPS = 3001;

// Caminhos para os arquivos de certificado
const SSL_KEY = path.join(__dirname, 'server.key'); // Substitua pelo caminho correto do seu certificado
const SSL_CERT = path.join(__dirname, 'server.cert');

const framesDir = path.join(__dirname, 'frames');
const processedDir = path.join(__dirname, 'processed');

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

// Função para verificar se a mão está próxima ao rosto
async function isHandNearFace(hand, face) {
    // Pontos-chave da mão
    const fingerTip = hand.keypoints.find(kp => kp.name === 'index_finger_tip');

    if (!fingerTip) {
        console.warn('Ponta do dedo indicador não encontrada.');
        return false;
    }

    // Verificar se os landmarks estão disponíveis
    const landmarks = face.landmarks.positions;
    if (!landmarks || landmarks.length < 68) {
        console.warn('Landmarks faciais insuficientes.');
        return false;
    }

    // Ponta do nariz (índice 30)
    const noseTip = landmarks[30];

    // Pontos da boca (índices 48 a 67)
    const mouthPoints = landmarks.slice(48, 68);
    const mouthCenter = mouthPoints.reduce((acc, point) => {
        return {
            x: acc.x + point.x / mouthPoints.length,
            y: acc.y + point.y / mouthPoints.length
        };
    }, { x: 0, y: 0 });

    // Calcular distâncias
    const distanceToNose = Math.hypot(fingerTip.x - noseTip.x, fingerTip.y - noseTip.y);
    const distanceToMouth = Math.hypot(fingerTip.x - mouthCenter.x, fingerTip.y - mouthCenter.y);

    // Definir um limite para considerar como "mão próxima ao rosto"
    const threshold = 50; // Ajuste conforme necessário

    return distanceToNose < threshold || distanceToMouth < threshold;
}

// Função para desenhar as detecções no frame
function drawDetections(ctx, hands, faces) {
    // Configurações de cor para as mãos
    const handColors = [
        { point: 'blue', line: 'white' },
        { point: 'red', line: 'yellow' }
    ];

    // Desenhar mãos detectadas
    hands.forEach((hand, handIndex) => {
        const color = handColors[handIndex % handColors.length];
        ctx.fillStyle = color.point;
        ctx.strokeStyle = color.line;
        ctx.lineWidth = 2;

        hand.keypoints.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // Desenhar rostos detectados
    faces.forEach((face) => {
        const { alignedRect, landmarks } = face;

        if (alignedRect) {
            const { _x, _y, _width, _height } = alignedRect._box;

            // Desenhar a caixa delimitadora do rosto
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.strokeRect(_x, _y, _width, _height);
        }

        if (landmarks) {
            const points = landmarks.positions;
            ctx.fillStyle = 'yellow';
            points.forEach(({ x, y }) => {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            console.warn('Landmarks ausentes para o rosto.');
        }
    });
}

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

            // Ler a imagem e convertê-la em canvas
            const image = await Jimp.read(framePath);
            const canvasImg = createCanvas(image.bitmap.width, image.bitmap.height);
            const ctx = canvasImg.getContext('2d');
            ctx.drawImage(await loadImage(framePath), 0, 0);

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
                // Usar a primeira mão e o primeiro rosto detectados
                const hand = hands[0];
                const face = faces[0];

                // Chamar a função de detecção
                const isNear = await isHandNearFace(hand, face);

                if (isNear) {
                    console.log('Mão próxima ao rosto detectada!');
                    movementDetected = true;
                    // Aqui você pode adicionar ações adicionais, como registrar o evento
                } else {
                    console.log('Mão longe do rosto.');
                }
            } else {
                console.log(`Nenhuma mão ou rosto detectado no frame: ${framePath}`);
            }

            // Após a detecção, desenhar as detecções no frame
            drawDetections(ctx, hands, faces);

            // Salvar o frame processado
            const processedPath = path.join(processedDir, path.basename(framePath));
            const out = fs.createWriteStream(processedPath);
            const stream = canvasImg.createJPEGStream();
            stream.pipe(out);

            out.on('finish', () => {
                console.log(`Frame processado salvo em: ${processedPath}`);
            });

        } catch (error) {
            console.error(`Erro ao processar o frame ${framePath}:`, error);
        }
    }

    return movementDetected;
}

app.get('/s', (req, res) => {
    res.send('Bem-vindo ao servidor Node.js com HTTP e HTTPS!');
});

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

app.get('/daily-movements', async (req, res) => {
    const currentDate = new Date().toISOString().split('T')[0]; // Data no formato YYYY-MM-DD
    const timestamp = Date.now();
    const jsonDir = path.join(__dirname, 'jsonDia');
    const jsonFilePath = path.join(jsonDir, `${currentDate}_${timestamp}.json`);

    try {
        // Garantir que o diretório de JSONs existe
        fs.mkdirSync(jsonDir, { recursive: true });

        // Verificar se já existe um JSON para o dia
        const existingFiles = fs.readdirSync(jsonDir).filter(file => file.startsWith(currentDate));
        if (existingFiles.length > 0) {
            console.log(`JSON do dia encontrado: ${existingFiles[0]}`);
            const existingData = fs.readFileSync(path.join(jsonDir, existingFiles[0]));
            return res.json(JSON.parse(existingData));
        }

        // Ler os arquivos no diretório de frames
        const files = fs.readdirSync(framesDir);

        // Filtrar os arquivos pela data de modificação
        const dailyFrames = files.filter(file => {
            const filePath = path.join(framesDir, file);
            const stats = fs.statSync(filePath);
            const modifiedDate = new Date(stats.mtime).toISOString().split('T')[0];
            return modifiedDate === currentDate && (file.endsWith('.jpg') || file.endsWith('.png'));
        });

        if (dailyFrames.length === 0) {
            const response = {
                data: currentDate,
                movements: [],
                message: 'Nenhum frame processado encontrado para o dia atual.'
            };
            fs.writeFileSync(jsonFilePath, JSON.stringify(response, null, 2));
            return res.json(response);
        }

        const movements = [];

        // Criar uma nova pasta com timestamp para salvar as imagens processadas
        const tempDir = path.join(__dirname, 'temp', String(timestamp));
        fs.mkdirSync(tempDir, { recursive: true });

        console.log(`Criando pasta temporária: ${tempDir}`);

        // Processar os frames do dia
        for (const frame of dailyFrames) {
            const framePath = path.join(framesDir, frame);

            try {
                console.log(`Processando o frame: ${frame}`);
                const image = await Jimp.read(framePath);
                const canvasImg = createCanvas(image.bitmap.width, image.bitmap.height);
                const ctx = canvasImg.getContext('2d');
                ctx.drawImage(await loadImage(framePath), 0, 0);

                // Detectar mãos e rostos
                const hands = await detectHands(canvasImg);
                const faces = await detectFaces(canvasImg);

                let status = 'Nenhuma mão ou rosto detectado.';
                if (hands.length > 0 && faces.length > 0) {
                    const isNear = await isHandNearFace(hands[0], faces[0]);
                    status = isNear ? 'Mão próxima ao rosto detectada!' : 'Mão longe do rosto.';
                }

                // Desenhar as detecções na imagem
                drawDetections(ctx, hands, faces);

                // Obter imagem com marcações como base64
                const markedImageBase64 = canvasImg.toBuffer('image/jpeg').toString('base64');

                movements.push({
                    frame,
                    status,
                    image: `data:image/jpeg;base64,${markedImageBase64}`
                });

                // Salvar imagem processada na pasta temp
                const processedFilePath = path.join(tempDir, frame);
                const outStream = fs.createWriteStream(processedFilePath);
                const jpegStream = canvasImg.createJPEGStream();
                jpegStream.pipe(outStream);

                outStream.on('finish', () => {
                    console.log(`Imagem processada salva em: ${processedFilePath}`);
                });

            } catch (frameError) {
                console.error(`Erro ao processar o frame ${frame}:`, frameError);
                movements.push({
                    frame,
                    status: 'Erro ao processar este frame.',
                    image: null
                });
            }
        }

        console.log('Processamento concluído. Todas as imagens foram movidas para a pasta temp.');

        // Criar o objeto de resposta final
        const response = {
            data: currentDate,
            movements
        };

        // Salvar o JSON no diretório jsonDia
        fs.writeFileSync(jsonFilePath, JSON.stringify(response, null, 2));

        // Retornar o resultado final
        res.json(response);

    } catch (error) {
        console.error('Erro ao processar frames do dia:', error);
        const errorResponse = {
            data: currentDate,
            movements: [],
            message: 'Erro ao processar os frames do dia.'
        };
        fs.writeFileSync(jsonFilePath, JSON.stringify(errorResponse, null, 2));
        res.status(500).json(errorResponse);
    }
});

async function detectHands(canvasImg) {
    try {
        return await handposeModel.estimateHands(tf.browser.fromPixels(canvasImg));
    } catch (error) {
        console.warn('Erro ao detectar mãos:', error);
        return [];
    }
}

async function detectFaces(canvasImg) {
    try {
        return await faceapi.detectAllFaces(canvasImg).withFaceLandmarks();
    } catch (error) {
        console.warn('Erro ao detectar rostos:', error);
        return [];
    }
}

// Configuração do servidor HTTP
http.createServer(app).listen(PORT_HTTP, () => {
    console.log(`Servidor HTTP rodando em http://localhost:${PORT_HTTP}`);
});

// Configuração do servidor HTTPS
https.createServer(
    {
        key: fs.readFileSync(SSL_KEY),
        cert: fs.readFileSync(SSL_CERT),
    },
    app
).listen(PORT_HTTPS, () => {
    console.log(`Servidor HTTPS rodando em https://localhost:${PORT_HTTPS}`);
});
