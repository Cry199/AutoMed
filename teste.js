const Jimp = require('jimp');

async function testJimp() 
{

    const image = await Jimp.read('C:/Users/caual/OneDrive/Imagens/a/teste.jpg');
    
    console.log('Imagem carregada com sucesso!', image);
}

testJimp();
