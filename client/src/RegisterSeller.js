import React, { Component } from 'react'
import LandContract from "./artifacts/Land.json"
import getWeb3 from "./getWeb3"
import ipfs from './ipfs';

import { FormGroup, FormControl, Button, Spinner, FormFile } from 'react-bootstrap'

//import Navigation from './Navigation'

class RegisterSeller extends Component {
    constructor(props) {
        super(props)

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            name: '',
            age: '',
            aadharNumber: '',
            panNumber: '',
            landsOwned: '',
            isVerified: false,
            buffer2: null,
            document: '',
        }
        this.captureDoc = this.captureDoc.bind(this);
        this.addDoc = this.addDoc.bind(this);
    }

    componentDidMount = async () => {
        try {
            //Get network provider and web3 instance
            const web3 = await getWeb3();

            const accounts = await web3.eth.getAccounts();

            const networkId = await web3.eth.net.getId();
            const deployedNetwork = 
                LandContract.networks[networkId] || 
                LandContract.networks['5777'] || 
                LandContract.networks['1337'] || 
                Object.values(LandContract.networks || {})[0];

            if (!deployedNetwork || !deployedNetwork.address) {
                throw new Error("Smart contract address not found in build artifacts. Please deploy contracts to Ganache.");
            }

            const instance = new web3.eth.Contract(
                LandContract.abi,
                deployedNetwork.address,
            );

            const currentAddress = (accounts && accounts.length > 0) ? accounts[0] : (web3.currentProvider ? web3.currentProvider.selectedAddress : null);
            let isAlreadyRegistered = false;
            let isBuyer = false;
            if (currentAddress) {
                try {
                    isAlreadyRegistered = await instance.methods.isRegistered(currentAddress).call();
                    isBuyer = await instance.methods.isBuyer(currentAddress).call();
                } catch (e) {
                    console.warn(e);
                }
            }
            this.setState({ 
                LandInstance: instance, 
                web3: web3, 
                account: currentAddress,
                isAlreadyRegistered: isAlreadyRegistered,
                isBuyer: isBuyer 
            });

            if (window.ethereum) {
                window.ethereum.on('accountsChanged', () => window.location.reload());
            }

        } catch (error) {
            console.error("RegisterSeller error:", error);
            alert(
                `Failed to load web3, accounts, or contract: ${error.message || error}`,
            );
        }
    };

    switchAccount = async () => {
        if (window.ethereum && window.ethereum.request) {
            try {
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
                window.location.reload();
            } catch (e) {
                console.warn(e);
            }
        } else {
            alert("Please switch accounts inside your MetaMask extension.");
        }
    };

    addDoc = async () => {
        await ipfs.files.add(this.state.buffer2, (error, result) => {
          if (error) {
            alert(error)
            return
          }
    
          console.log('IPFS Document hash:', result[0].hash);
          this.setState({ document: result[0].hash });
        })
      }

    registerSeller = async () => {
        this.addDoc();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.state.isAlreadyRegistered) {
            alert("This wallet address is already registered on the blockchain! Each role requires a unique wallet. Please switch to Account 1 in MetaMask to register as a Seller.");
            return;
        }
        if (this.state.name == '' || this.state.age == '' || this.state.aadharNumber == '' || this.state.panNumber == '' || this.state.landsOwned == '') {
            alert("All the fields are compulsory!");
        } else if (!Number(this.state.aadharNumber) || this.state.aadharNumber.length != 12) {
            alert("Aadhar Number should be 12 digits long!");
        } else if (this.state.panNumber.length != 10) {
            alert("Pan Number should be a 10 digit unique number!");
        } else if (!Number(this.state.age) || this.state.age < 21) {
            alert("Age must be 21 or older!");
        } else {
            try {
                await this.state.LandInstance.methods.registerSeller(
                    this.state.name,
                    this.state.age,
                    this.state.aadharNumber,
                    this.state.panNumber,
                    this.state.landsOwned, 
                    this.state.document)
                    .send({
                        from: this.state.account,
                        gas: 2100000
                    });

                alert("Seller registered successfully on blockchain!");
                this.props.history.push("/Seller/SellerDashboard");
                window.location.reload(false);
            } catch (error) {
                console.error("Seller registration error:", error);
                if (error.message && error.message.includes("revert")) {
                    alert("Registration failed: This wallet is already registered on the blockchain. Please switch to Account 1 in MetaMask to register as a Seller.");
                } else {
                    alert("Registration error: " + (error.message || error));
                }
            }
        }
    }

    updateName = event => (
        this.setState({ name: event.target.value })
    )
    updateAge = event => (
        this.setState({ age: event.target.value })
    )
    updateAadhar = event => (
        this.setState({ aadharNumber: event.target.value })
    )
    updatePan = event => (
        this.setState({ panNumber: event.target.value })
    )
    updateOwnedLands = event => (
        this.setState({ landsOwned: event.target.value })
    )
    captureDoc(event) {
        event.preventDefault()
        const file2 = event.target.files[0]
        const reader2 = new window.FileReader()
        reader2.readAsArrayBuffer(file2)
        reader2.onloadend = () => {
          this.setState({ buffer2: Buffer(reader2.result) })
          console.log('buffer2', this.state.buffer2)
        }
        console.log('caoture doc...')
      }

    render() {
        if (!this.state.web3) {
            return (
                <div>
                    <div className="img-wrapper">
                        <img src="https://i.pinimg.com/originals/71/6e/00/716e00537e8526347390d64ec900107d.png" className="logo" />
                        <div className="wine-text-container">
                            <div className="site-title wood-text">Land Registry</div>
                        </div>
                    </div>
                    <div className="auth-wrapper">
                        <div className="auth-inner">
                            <div>
                                <div>
                                    <h1>
                                        <Spinner animation="border" variant="warning" />
                                    </h1>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="bodyC">

                <div className="img-wrapper">
                    <img src="https://i.pinimg.com/originals/71/6e/00/716e00537e8526347390d64ec900107d.png" className="logo" alt="BhumiChain Logo" />
                    <div className="wine-text-container">
                        <div className="site-title wood-text">BHUMICHAIN</div>
                        <div style={{ fontSize: "14px", color: "#94a3b8", letterSpacing: "3px", textTransform: "uppercase", fontWeight: "600", marginTop: "2px" }}>
                            Decentralized Land Registry
                        </div>
                    </div>
                </div>
                <div className="auth-wrapper">
                    <div className="auth-inner">
                        <div className="App">

                            <div>
                                <div>
                                    <h1 style={{ color: "black" }}>
                                        Seller Registration
                                    </h1>
                                    {this.state.isAlreadyRegistered && (
                                        <div className="alert alert-warning" style={{ borderRadius: "8px", fontSize: "13px", margin: "14px 0", textAlign: "left" }}>
                                            <strong>⚠️ Wallet Already Registered:</strong> This wallet (<code>{this.state.account ? `${this.state.account.substring(0, 10)}...` : ''}</code>) is already registered on the blockchain as {this.state.isBuyer ? "a Buyer" : "a user"}.<br />
                                            Each role requires a separate wallet address.<br />
                                            <div style={{ marginTop: "10px" }}>
                                                <Button variant="warning" size="sm" onClick={this.switchAccount} style={{ fontWeight: "bold" }}>
                                                    🦊 Switch Account in MetaMask
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>



                            <div className="form">
                                <FormGroup>
                                    <div className="form-label">
                                        Enter Name --
                      </div>
                                    <div className="form-input">
                                        <FormControl
                                            input='text'
                                            value={this.state.name}
                                            onChange={this.updateName}
                                        />
                                    </div>
                                </FormGroup>

                                <FormGroup>
                                    <div className="form-label">
                                        Enter Age --
                      </div>
                                    <div className="form-input">
                                        <FormControl
                                            input='text'
                                            value={this.state.age}
                                            onChange={this.updateAge}
                                        />
                                    </div>
                                </FormGroup>

                                <FormGroup>
                                    <div className="form-label">
                                        Enter Aadhar No --
                      </div>
                                    <div className="form-input">
                                        <FormControl
                                            input='text'
                                            value={this.state.aadharNumber}
                                            onChange={this.updateAadhar}
                                        />
                                    </div>
                                </FormGroup>

                                <FormGroup>
                                    <div className="form-label">
                                        Enter Pan no --
                      </div>
                                    <div className="form-input">
                                        <FormControl
                                            input='text'
                                            value={this.state.panNumber}
                                            onChange={this.updatePan}
                                        />
                                    </div>
                                </FormGroup>

                                <FormGroup>
                                    <div className="form-label">
                                        Enter Owned Lands --
                      </div>
                                    <div className="form-input">
                                        <FormControl
                                            input='text'
                                            placeholder="e.g. 1 Plot (Survey No. 42, Pune) or 2 Plots"
                                            value={this.state.landsOwned}
                                            onChange={this.updateOwnedLands}
                                        />
                                    </div>
                                </FormGroup>

                                <FormGroup>
                                    <label>Add your Aadhar Card (PDF Format)</label>
                                    <FormFile
                                        id="File2"
                                        onChange={this.captureDoc}
                                    />
                                </FormGroup>


                                <Button onClick={this.registerSeller} className="button-vote">
                                    Register as Seller
                  </Button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );

    }
}

export default RegisterSeller;
