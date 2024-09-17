const fs = require('fs');
const path = require('path');
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("@langchain/openai");
require('dotenv').config();

// Function to read text from a TXT file
const readTextFromFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8').trim(); // Read file and trim whitespace
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
};

// Function to build the vector database from an array of texts
const buildVectorDatabase = async (texts) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OpenAI API key is not set. Please set your OPENAI_API_KEY in the environment variables.');
    process.exit(1);
  }

  const ids = texts.map((_, index) => ({ id: index + 1 }));
  const embeddingsModel = new OpenAIEmbeddings({ apiKey });

  const vectorStore = await FaissStore.fromTexts(texts, ids, embeddingsModel);
  await vectorStore.save(path.join(__dirname, 'vector_database'));
  console.log('Vector database built and saved successfully!');
};

// Main function to handle the text processing and vector database creation
const main = async () => {
  const trainingDir = path.join(__dirname, 'training');
  const textFiles = fs.readdirSync(trainingDir).filter(file => file.endsWith('.txt'));
  const texts = [];

  for (let fileName of textFiles) {
    const filePath = path.join(trainingDir, fileName);
    const text = readTextFromFile(filePath);
    if (text) texts.push(text);
  }

  if (texts.length > 0) {
    await buildVectorDatabase(texts);
  } else {
    console.log('No text found in files, vector database not created.');
  }
};

main();
