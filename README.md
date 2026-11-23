# Decentralized Land Registration System Using Blockchain

<p align="center">
  <img src="https://img.shields.io/badge/Ethereum-Blockchain-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" />
  <img src="https://img.shields.io/badge/Solidity-Smart%20Contracts-363636?style=for-the-badge&logo=solidity&logoColor=white" />
  <img src="https://img.shields.io/badge/React-17.0.2-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Truffle-Ganache-E4A14B?style=for-the-badge&logo=truffle&logoColor=white" />
  <img src="https://img.shields.io/badge/MetaMask-Web3-E2761B?style=for-the-badge&logo=metamask&logoColor=white" />
</p>

---

## 🏛️ Academic Information

- **Institution:** Loknete Shamrao Peje Government College of Engineering
- **Department:** Department of Artificial Intelligence & Data Science
- **Project Type:** Capstone Final Year Engineering Project
- **Academic Year / Semester:** Final Year / 7th Semester (2026-2027)

### 👨‍💻 Project Team Members

| Name | Roll Number / Student ID | Email | Role |
| :--- | :--- | :--- | :--- |
| **Vivek Punde** | `23030421995010` | vivekpunde6@gmail.com | Lead Developer / Smart Contracts |
| **Aryan Mhatre** | `23030421995042` | — | Frontend & Web3 Integration |
| **Rohit Dongre** | `23030421995006` | — | Testing & Blockchain Verification |

---

## 📖 Project Overview

Land registration systems in many jurisdictions suffer from bureaucratic delays, physical record tampering, fraud, and lack of transparency. Duplicate deeds and illegal transfers often lead to lengthy litigation.

This project delivers a **Decentralized Land Registration & Ownership Transfer Platform** built on the **Ethereum Blockchain**. It leverages smart contracts and decentralized storage (IPFS) to guarantee that all land records, user identities, and financial transactions remain **immutable, auditable, and secure**.

### 🌟 Key Features

1. **Role-Based Access Control**:
   - **Land Inspector (Government Admin)**: Deployed automatically from the deployer wallet. Verifies user identities (Aadhar, PAN) and approves land ownership transfers.
   - **Seller**: Verified land owners register properties with geometric details, pricing (in ETH), PID, survey number, and title deeds.
   - **Buyer**: Verified citizens explore the marketplace, request land purchases, and transfer payments directly via Ethereum cryptocurrency.
2. **Cryptographic Verification**:
   - Users cannot list land or request purchases until identity documents are validated by the Land Inspector.
3. **Decentralized Storage (IPFS)**:
   - Property photos and legal title deeds are cryptographically hashed and referenced on-chain.
4. **Transparent Ownership Transfer**:
   - Automatic record update upon payment receipt and administrative verification.

---

## 🛠️ Tech Stack

- **Blockchain Engine:** Ethereum Virtual Machine (EVM), Solidity (`>= 0.5.2`)
- **Development & Testing:** Truffle Suite, Ganache Local Blockchain
- **Web3 Wallet Provider:** MetaMask Browser Extension
- **Client Application:** React.js, Web3.js, Drizzle, Reactstrap, Bootstrap, Chart.js
- **Decentralized File Storage:** IPFS (InterPlanetary File System)

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Recommended: **v16.20.2 LTS** using NVM)
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI)
- [MetaMask](https://metamask.io/) Extension in Chrome / Edge / Brave

### 2. Configure Ganache
1. Launch **Ganache** and choose **Quickstart Ethereum**.
2. Verify settings:
   - **RPC Server:** `HTTP://127.0.0.1:7545`
   - **Network ID:** `5777`

### 3. Smart Contract Deployment
Open a terminal in the root directory:
```powershell
# Compile the Solidity smart contracts
truffle compile --all

# Deploy contracts onto your local Ganache network
truffle migrate --reset
```

### 4. Configure MetaMask
1. Add a custom RPC network:
   - **Network Name:** `Ganache Local`
   - **RPC URL:** `http://127.0.0.1:7545`
   - **Chain ID:** `1337` (or `5777`)
   - **Currency Symbol:** `ETH`
2. Import at least 3 accounts from Ganache into MetaMask using their Private Keys:
   - **Account 0 (Deployer):** Land Inspector / Admin
   - **Account 1:** Seller
   - **Account 2:** Buyer

### 5. Start the React Frontend
```powershell
cd client
npm install
npm start
```
The application will launch automatically at `http://localhost:3000`.

---

## 📸 Application Screenshots

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

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
#