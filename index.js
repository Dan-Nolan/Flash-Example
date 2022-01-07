require("dotenv").config();

const ethers = require("ethers");
const { providers, Wallet } = ethers;
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");

const url = process.env.ETHEREUM_RPC_URL;
const privateKey = process.env.PRIVATE_KEY;

// Standard json rpc provider directly from ethers.js (NOT Flashbots)
const provider = new providers.JsonRpcProvider(url);

const wallet = new Wallet(privateKey, provider);

async function main() {
    const authSigner = Wallet.createRandom();
    // Flashbots provider requires passing in a standard provider
    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        authSigner,
        "https://relay-goerli.flashbots.net/",
        "goerli"
    );
    
    const signedTransaction2 = await wallet.signTransaction({
        to: "0x5BdE00Fa25B769A1Ae2B3EaC9986d207E875c3e3",
        value: ethers.utils.parseEther("0.1"),
        gasPrice: ethers.utils.parseUnits("10", "gwei"),
        nonce: await wallet.getTransactionCount() + 1,
        gasLimit: 21000
    });
    const transactionBundle = [
        {
            // 1. Syntax 1: pass transaction props over 
            transaction: {
                to: "0x5BdE00Fa25B769A1Ae2B3EaC9986d207E875c3e3",
                value: ethers.utils.parseEther("0.1"),
                gasPrice: ethers.utils.parseUnits("10", "gwei"),
                nonce: await wallet.getTransactionCount(),
                gasLimit: 21000
            },
            signer: wallet 
        },
        {
            // 2. Syntax 2: sign this transaction manually
            signedTransaction: signedTransaction2
        }
    ];

    // COMMENT THIS OUT FOR DEBUGGING:
    // const signedTransactions = await flashbotsProvider.signBundle(transactionBundle)
    // const simulation = await flashbotsProvider.simulate(signedTransactions, (await provider.getBlockNumber()) + 1)
    // console.log(JSON.stringify(simulation, null, 2))
    
    // ACTUALLY SUBMITTING THE BUNDLE
    provider.on("block", async () => {
        const targetBlockNumber = (await provider.getBlockNumber()) + 1;
        const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
            transactionBundle,
            targetBlockNumber,
        );
        const waitResponse = await flashbotsTransactionResponse.wait();
        if(waitResponse === 0) {
            console.log("Success!");
            process.exit();
        }
        else {
            console.log("No Success :(");
        }
    });
}

main();