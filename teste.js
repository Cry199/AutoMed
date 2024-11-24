const tf = require('@tensorflow/tfjs-node');

console.log('tf.version.tfjs');

const tensor = tf.tensor([1, 2, 3, 4], [2, 2]);
tensor.print();
