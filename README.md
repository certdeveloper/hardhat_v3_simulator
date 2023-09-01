# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

yarn hardhat run scripts/sample-script.js --network hardhat


block_jump: any number greater than 0

op_type: addliquidity, limitbuy, fomobuy, sell, approve, quote_approve, function_call, multicall, antibot
    if op_type is not set, op can be treated normal tx

token_amount: token_amount can be percent number or static
-- multicall (creat pool and addliquidity with uniswap v3)
    options: from(default: tokenOwner), to(defautl: uniswap v3 position manager contract), gasLimit(default: null)
    require_file: positionManager.json
    
    ex:
        {
            from: "0xb7e7A1993372c3b87C3fB8562F0D4BE84F6f3AFb",
            op_type: "multicall",
            gasLimit: 5000000,
                
        },

-- antibot
    requires: amountPerTx, eth_amount_max, isV3Swap, from
    options: gasLimit
    
    ex:
        {
            from: "0x5731Ed73617082CAfF395bc53Ef56F1c84c2f037",
            op_type: "antibot",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
            isV3Swap: false,
            amountPerTx: '100',
            eth_amount_max: "100",
            gasLimit: 6000000
        },

--addliquidity
    requires: token_amount, eth_amount,
    options: from(default: tokenOwner), to(default: uniRouter), gasLimit(default: null)
    
    ex: 
        {
            op_type: "addliquidity",
            token_amount: "0.1%",
            eth_amount: "1",
        }

--limitbuy
    requires: token_amount, from, eth_amount_max, isV3Swap
    options: to(default: uniRouter), gasLimit(default: null)
   
    ex: 
        {
            op_type: "limitbuy",
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            token_amount: "0.1%",
            eth_amount_max: "2",
            isV3Swap: false,
        }

--fomobuy
    requires: eth_amount, from, isV3Swap, 
    options: to(default: uniRouter), gasLimit(default: null)

    ex:
        {
            op_type: "fomobuy",
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            eth_amount: "0.1",
            isV3Swap: false,
        }

--sell
    requires: from, token_amount, isV3Swap
    options: to(default: uniRouter), gasLimit(default: null)

    ex:
        {
            op_type: "sell",
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            token_amount: "0.5%",
            isV3Swap: false,
        }


--approve
    requires: isV3Swap
    options: from(default: tokenOwner), router(default: uniRouter), gasLimit(default: null)
    
    ex:
        {
            op_type: "approve",
            router: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // v3 position manager for addliquidity 
            router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // v3 router for swap
            router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", //v2 router,
            isV3Swap: true,
        }

--quote_approve
    requires: isV3Swap,
    options: from(default: tokenOwner), router(default: uniRouter), gasLimit(default: null)
    
    ex:
        {
            op_type: "quote_approve",
            router: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // v3 position manager for addliquidity 
            router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // v3 router for swap
            router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", //v2 router
            isV3Swap: true,
        }

--function_call
    requires: function, params
    options: from(default: tokenOwner), to(default: token), gasLimit(default: null)
    require_file: tokenAbi.json
    function_call can be read/write function
    
    ex:
        {
            op_type: "function_call",
            function: "openTrading",
            params: [true]
        }

  
--normal_tx
    requires: to, data, value
    options: from(default: tokenOwner), gasLimit(default: null)
    
    ex:
        {
            from: "0x8A77FdFA18757A4aCB903ED57065d936506F9680",
            to: "0x0f607cc6da7a564ba82818b1f475dc18ba1b153c,
            data: "0x8a8c523c",
            value: "0"
        }

                // {
        //     from: "0xCE222910bA7524cADc75DDC7c57Ec5b97E8bFfc9",
        //     op_type: "limitbuy",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     token_amount: "1%",
        //     eth_amount_max: "4",
        //     gasLimit: 900000
        // },
        // {
        //     from: "0xEb9Bd485fF5ffE495F146Bbfdc41f0540Ed973Bc",
        //     op_type: "limitbuy",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     token_amount: "1%",
        //     eth_amount_max: "4",
        //     gasLimit: 900000
        // },
        // {
        //     from: "0xE208a3B3275d310D1408f4D1514AFc38bC7efae4",
        //     op_type: "limitbuy",                                       // limitbuy requires token_amount, fomobuy requires eth_amount
        //     token_amount: "1%",
        //     eth_amount_max: "4",
        //     gasLimit: 900000
        // },