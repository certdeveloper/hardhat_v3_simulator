module.exports = {
    blockNumber:        17923912,  // block number to fork from 
    setBlances: [
        //{ address: "0xdc5E5c1f28C3ca4C712e99EB61C8E7FA740b1E24", value: "55" },                       
        { address: "0xBe6c60E5eC859A2Bac39bb4F0881C6922b8fEA20", value: "25" },                      
        //{ address: "0x30Fde03E9eC311A8d53A7d47A397517A2776138d", value: "2" },                        
        
    ],
    tokenAddy: "0x99Ab43BBf99F019109Ff15562C2E7F31d6a3860e", // (Contract address)
    quoteTokenAddy: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
   
    simulates: [
        {
            from: "0x81FBD7a1F4Ad93853B73437F909b54DD9E68f62D", // Approve for trade on uniswap 
            op_type: "approve",
            isV3Swap: false,
        },
        {
            from: "0x81FBD7a1F4Ad93853B73437F909b54DD9E68f62D", // Approve for trade on uniswap 
            to: "0x99Ab43BBf99F019109Ff15562C2E7F31d6a3860e",
            op_type: "transfer",
            amount: "1000000",
        },
        {
            block_jump: 1
    },

        {
            from: "0x81FBD7a1F4Ad93853B73437F909b54DD9E68f62D", // Approve for trade on uniswap 
            to: "0xD5ffC33F60c97f76583eA4BFE225A68eD35CbaBd",
            data: "0xfff6cae9",
            gasLimit: 3000000,
            value: "0",
        },
        {
                block_jump: 1
        },

        { 
            from: "0x81FBD7a1F4Ad93853B73437F909b54DD9E68f62D",
            op_type: "addliquidity",
            token_amount: "10%",
            eth_amount: "1",
            gasLimit: 3000000,
        },
        // {
        //     from: "0x2b71927ce4073a7F648190f20e20CF0C0C168060",
        //     op_type: "quote_approve",
        //     isV3Swap: false,
        // },
        // {
        //     from: "0x5731Ed73617082CAfF395bc53Ef56F1c84c2f037", // Approve for trade on uniswap 
        //     op_type: "approve",
        //     isV3Swap: false,
        // },
        // { 
        //     from: "0x5731Ed73617082CAfF395bc53Ef56F1c84c2f037",
        //     op_type: "addliquidity",
        //     token_amount: "15%",
        //     eth_amount: "2",
        //     gasLimit: 5000000,
        // },
        // {
        //     block_jump: 1
        // },
        // {
        //     block_jump: 1
        // },
        // {
        //     from:"0xf113872374a65D80D9A2A307B125afF9E5201A1a",
        //     to:"0x399F1533Ba7D53bDE22B7Ff81634Cc5ae3e370D7",
        //     data: "0x8119c065",
        //     value: "0",
        //     gasLimit: "800000"
        // },
        // {
        //     op_type: "fomobuy",
        //     from: "0xCE222910bA7524cADc75DDC7c57Ec5b97E8bFfc9",
        //     eth_amount: "5",
        //     gasLimit: 900000,
        //     isV3Swap: false,
        // },
        // {
        //     from: "0x196F6f8d7982977818c5cB12d8487C7C647a6DAf",
        //     op_type: "approve",
        //     isV3Swap: true,
        // },
        // {
        //     from: "0xCE222910bA7524cADc75DDC7c57Ec5b97E8bFfc9",
        //     op_type: "approve",
        //     isV3Swap: false,
        // },
        // // {
        // //     block_jump: 2
        // // },
        // // {
        // //     op_type: "fomobuy",
        // //     from: "0xf113872374a65D80D9A2A307B125afF9E5201A1a",
        // //     eth_amount: "1",
        // //     isV3Swap: false,
        // //     gasLimit: 900000
        // // },
        // // {
        // //     block_jump: 6
        // // },
        // // {
        // //     from: "0xf113872374a65D80D9A2A307B125afF9E5201A1a",
        // //     op_type: "limitbuy",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        // //     token_amount: "1%",
        // //     eth_amount_max: "25",
        // //     gasLimit: 2000000
        // // },
        // // {
        // //     block_jump: 3
        // // },
        // {
        //     from: "0xCE222910bA7524cADc75DDC7c57Ec5b97E8bFfc9",
        //     op_type: "sell",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     token_amount: "0.5%",
        //     isV3Swap: false,
        //     gasLimit: 600000
        // },
        // // {
        // //     block_jump: 2
        // // },
    
        // {
        //     from: "0xEb9Bd485fF5ffE495F146Bbfdc41f0540Ed973Bc",
        //     op_type: "limitbuy",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     token_amount: "2%",
        //     gasLimit: 2000000,
        //     eth_amount_max: "1",
        //     isV3Swap: false,
        // },
        // {
        //     block_jump: 1
        // },
        // {
        //     from: "0xCE222910bA7524cADc75DDC7c57Ec5b97E8bFfc9",
        //     op_type: "sell",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     token_amount: "0.76%",
        //     isV3Swap: true,
        //     gasLimit: 600000
        // },
        // {
        //     from: "0x5731Ed73617082CAfF395bc53Ef56F1c84c2f037",
        //     op_type: "antibot",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     isV3Swap: false,
        //     amountPerTx: '100',
        //     eth_amount_max: "100",
        //     gasLimit: 6000000
        // },
   
    ]
};