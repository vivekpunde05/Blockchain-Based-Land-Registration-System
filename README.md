# Blockchain-Based Land Registration System

BhumiChain is an academic prototype for registering land records, reviewing user and property submissions, and demonstrating property transfers on a local Ethereum-compatible blockchain. The repository contains a Solidity smart contract, a React/Web3 client, Truffle migrations, and local development scripts.

> **Prototype only:** This project is not a production land registry, legal-record system, or secure identity platform. Read the [privacy and security limitations](#privacy-and-security-limitations) before using it.

## Project information

- **Institution:** Loknete Shamrao Peje Government College of Engineering
- **Department:** Artificial Intelligence & Data Science
- **Project:** Capstone final-year engineering project
- **Academic year / semester:** 2026–2027 / Final Year, 7th Semester

| Team member | Student ID | Role |
| :--- | :--- | :--- |
| Vivek Punde | `23030421995010` | Lead developer and smart contracts |
| Aryan Mhatre | `23030421995042` | Frontend and Web3 integration |
| Rohit Dongre | `23030421995006` | Testing and blockchain verification |

## What the application does

A registered citizen account can act as both a buyer and a seller. The Land Inspector is the wallet that deploys the contract.

- **Citizen registration:** Collects profile and identity fields and associates the registration with the connected wallet.
- **Inspector review:** Provides user management and land-record screens to review, verify, or reject submissions.
- **Land registration:** A verified user can submit a parcel with its area, location, price, property ID, survey number, and document reference.
- **Property management:** Owners can view their parcels, list verified land for sale, change the listed price, or cancel a listing.
- **Marketplace and offers:** Users can browse properties, submit purchase requests, view sent requests, and accept or reject incoming requests as the owner.
- **Payment and ownership history:** The client demonstrates payment through MetaMask. The contract records transfer details and updates the recorded owner; the client also provides ownership lookup and transaction-history screens.
- **Inspector dashboard:** Shows user, land-approval, and transaction information.

The intended user flow is: register a citizen wallet → have the Inspector review the account → register a parcel → have the Inspector review the parcel → list it → submit and review a purchase request → complete a wallet transaction.

## How it is implemented

- **Frontend:** React 17, React Router 5, Bootstrap/Reactstrap, and Web3.js 1.x.
- **Smart contract:** Solidity contract in [`contracts/Land.sol`](contracts/Land.sol), compiled with Solidity 0.5.16 in the checked-in artifact.
- **Local chain and migrations:** Ganache and Truffle; the development network uses RPC `127.0.0.1:7545`, network ID `5777`, and chain ID `1337`.
- **Contract artifact:** Truffle writes the ABI and network deployment data to `client/src/artifacts/`.
- **No application backend:** The browser connects to the blockchain through MetaMask/Web3.

### Repository layout

| Path | Purpose |
| :--- | :--- |
| `contracts/` | Solidity contract |
| `migrations/` | Truffle deployment migrations |
| `test/` | Truffle contract tests (see note below) |
| `client/src/views/` | Citizen, Inspector, marketplace, land, and transaction screens |
| `client/src/layouts/` and `client/src/routes*.js` | Role-specific application layouts and routes |
| `client/src/artifacts/` | Contract ABI and deployment metadata used by the client |
| `client/public/` | React static assets and application screenshots |
| `*.bat` | Windows development helper scripts |

## Run locally (Windows)

### Prerequisites

- Node.js and npm. Node.js 16 LTS is a suitable choice for this React Scripts 4 project.
- Truffle CLI and Ganache CLI.
- MetaMask in a browser.

Install the blockchain command-line tools if they are not already installed:

```powershell
npm install --global truffle ganache
```

### 1. Install frontend dependencies

From the repository root:

```powershell
cd client
npm install
cd ..
```

### 2. Start Ganache

In a separate terminal, start a local chain with the expected port and IDs:

```powershell
ganache --server.port 7545 --chain.networkId 5777 --chain.chainId 1337
```

Alternatively, use Ganache Desktop and configure the RPC port to `7545`, network ID to `5777`, and chain ID to `1337`.

### 3. Compile and deploy the contract

From the repository root, with Ganache running:

```powershell
truffle compile
truffle migrate --reset
```

The migration deploys `Land` and updates the artifact in `client/src/artifacts/`. The wallet that deploys the contract becomes the Land Inspector.

### 4. Connect MetaMask

Add a custom network with:

| Setting | Value |
| :--- | :--- |
| Network name | Ganache Local |
| RPC URL | `http://127.0.0.1:7545` |
| Chain ID | `1337` |
| Currency symbol | `ETH` |

Use accounts from this local Ganache instance for the Inspector and test citizens. Import accounts only into a development wallet; never use real or valuable accounts with this prototype.

### 5. Start the frontend

From the repository root:

```powershell
npm start
```

The React app runs at [http://localhost:3000](http://localhost:3000). You can also start it from the `client` directory with `npm start`.

The repository includes Windows helper scripts such as `start-blockchain.bat`, `deploy-contracts.bat`, and `start-client.bat`. Some scripts assume globally installed tools and a machine-specific PATH; use the commands above if a helper script does not work in your environment.

## Privacy and security limitations

This code is a local demonstration and should not be used to store real personal information or handle real property or funds.

- The contract stores profile details including Aadhaar and PAN fields directly on-chain. Blockchain data is not private or erasable; use synthetic test data only.
- The document helper does **not** upload files to IPFS. It creates placeholder `Qm...`-style identifiers and stores uploaded document previews in that browser's `localStorage`; another browser or device will not have those files. The IPFS gateway link in the viewer does not make these uploads decentralized.
- The username/password login is demo UI logic, not production authentication. It is not a security boundary for the role-specific pages.
- The contract's payment function does not enforce the listed sale price or require an accepted purchase request before transferring ownership. Do not rely on the UI flow as a contract-level safety check.
- `start-blockchain.bat` uses a fixed, publicly visible development mnemonic. It is for a disposable local chain only. Never use that mnemonic, its accounts, or their keys on a public network.
- The contract and application have not been hardened for production use, legal compliance, identity-data protection, or real-asset custody.

## Tests

The Truffle test file is [`test/land.js`](test/land.js). It contains legacy expectations and references contract methods that are not present in the current `Land.sol`; update the tests before treating them as validation of the current contract.

## Screenshots

| User Login | Land Inspector Login |
| :---: | :---: |
| <img src="client/public/Screenshot%202026-11-17%20175443.png" width="480" alt="User login portal" /> | <img src="client/public/Screenshot%202026-11-17%20180851.png" width="480" alt="Land inspector login portal" /> |
| Land Inspector Dashboard | Land Records & Approvals |
| <img src="client/public/Screenshot%202026-11-17%20174737.png" width="480" alt="Land inspector dashboard" /> | <img src="client/public/Screenshot%202026-11-17%20175036.png" width="480" alt="Land records and approvals" /> |
| Register a Property | Property Marketplace |
| <img src="client/public/Screenshot%202026-11-17%20175644.png" width="480" alt="Register a land property" /> | <img src="client/public/Screenshot%202026-11-17%20180551.png" width="480" alt="Registered properties marketplace" /> |
| MetaMask Accounts | MetaMask Transaction Confirmation |
| <img src="client/public/Screenshot%202026-11-17%20180027.png" width="240" alt="MetaMask accounts used with the application" /> | <img src="client/public/Screenshot%202026-11-17%20180731.png" width="240" alt="MetaMask transaction confirmation" /> |
| Blockchain Transaction Ledger | Transaction Details |
| <img src="client/public/Screenshot%202026-11-17%20181006.png" width="480" alt="Blockchain transaction ledger" /> | <img src="client/public/Screenshot%202026-11-17%20175223.png" width="480" alt="Blockchain transaction details" /> |

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).
