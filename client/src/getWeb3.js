import Web3 from "web3";

/**
 * Automatically prompts MetaMask to switch to the local Ganache network (Chain ID 1337),
 * or adds the network if it does not already exist in MetaMask.
 */
export const switchToGanache = async () => {
  if (!window.ethereum || !window.ethereum.request) return false;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x539" }], // 1337 in hex
    });
    return true;
  } catch (switchError) {
    // Error code 4902 indicates that the chain has not been added to MetaMask.
    if (
      switchError.code === 4902 ||
      (switchError.data && switchError.data.originalError && switchError.data.originalError.code === 4902)
    ) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x539",
              chainName: "Ganache Local (7545)",
              rpcUrls: ["http://127.0.0.1:7545"],
              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18,
              },
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Ganache chain to MetaMask:", addError);
        return false;
      }
    }
    console.warn("User rejected network switch:", switchError);
    return false;
  }
};

/**
 * Requests MetaMask connection and switches to Ganache Local
 */
export const connectWallet = async () => {
  if (!window.ethereum || !window.ethereum.request) {
    alert("MetaMask extension not found in this browser. Please install MetaMask to use this dApp.");
    return false;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await switchToGanache();
    window.location.reload();
    return true;
  } catch (err) {
    console.error("User denied account connection:", err);
    return false;
  }
};

const getWeb3 = () =>
  new Promise(async (resolve, reject) => {
    const resolveWeb3 = async () => {
      // Modern dapp browsers (MetaMask, Brave, etc.)...
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Check if already authorized first to prevent duplicate pending popups
          let accounts = [];
          if (window.ethereum.request) {
            try {
              accounts = await window.ethereum.request({ method: "eth_accounts" });
            } catch (e) {
              // Ignore and fall through to requestAccounts
            }
          }

          // If not already authorized, request access
          if (!accounts || accounts.length === 0) {
            if (window.ethereum.request) {
              await window.ethereum.request({ method: "eth_requestAccounts" });
            } else if (window.ethereum.enable) {
              await window.ethereum.enable();
            }
          }

          // Check network and attempt automatic switch to Ganache if on another chain
          if (window.ethereum.request) {
            try {
              const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
              const currentChainId = parseInt(chainIdHex, 16);
              if (currentChainId !== 1337 && currentChainId !== 5777) {
                console.log(`MetaMask is on chain ${currentChainId}, prompting switch to Ganache (1337)...`);
                await switchToGanache();
              }
            } catch (netErr) {
              console.warn("Auto-switch to Ganache non-fatal warning:", netErr);
            }
          }

          resolve(web3);
        } catch (error) {
          // Error code -32002 means MetaMask already has a pending permission popup
          if (error && (error.code === -32002 || (error.message && error.message.includes("already pending")))) {
            console.warn("MetaMask permission request is already pending in the extension. Resolving web3 instance.");
            resolve(web3);
          } else {
            console.error("MetaMask connection error, falling back to local Ganache provider:", error);
            const provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
            const fallbackWeb3 = new Web3(provider);
            resolve(fallbackWeb3);
          }
        }
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        const web3 = new Web3(window.web3.currentProvider);
        console.log("Injected legacy web3 detected.");
        resolve(web3);
      }
      // Fallback to localhost Ganache (port 7545)
      else {
        const provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
        const web3 = new Web3(provider);
        console.log("No web3 injected, falling back to Local Ganache on port 7545.");
        resolve(web3);
      }
    };

    if (window.ethereum || window.web3 || document.readyState === "complete") {
      resolveWeb3();
    } else {
      window.addEventListener("load", resolveWeb3);
    }
  });

export default getWeb3;
