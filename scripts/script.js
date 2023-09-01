const { ethers, waffle, network } = require("hardhat");

const config = require("../config");
const tokenAbi = require("../tokenAbi.json");
const uniswapAbi = require("../uniswapV2Abi.json");
const uniswapv3Abi = require("../uniswapV3Abi.json");
const v3PositionManagerAbi = require("../positionManger.json");
const v3FactoryAbi = require("../v3FactoryABI.json");
const { encodePriceSqrt, getMinTick, getMaxTick } = require("./utils");

const uniswapAddy = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const uniswapV3Addy = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const v3FactoryAddy = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const v3PositionManager = "0xc36442b4a4522e871399cd717abdd847ab11fe88";

const TICK_SPACING = {
	LOW: 10,
	MEDIUM: 60,
	HIGH: 200
}

const getSigner = async (from) => {
	await network.provider.request({
		method: "hardhat_impersonateAccount",
		params: [from]
	});
	return await ethers.getSigner(from);
}

const hexLabels = {};
const reduceData = (hex) => {
	if (hex == "0x095ea7b3") return "approve";
	if (hex == "0xf305d719") return "addLiquidityETH";
	if (hex == "0xfb3bdb41") return "swapETHForExactTokens";
	if (hex == "0x7ff36ab5") return "swapExactETHForTokens";
	if (hex == "0x791ac947") return "swapExactTokensForETHSupportingFeeOnTransferTokens";
	if (hex == "0xe8e33700") return "addLiquidity";
	if (hex == "0x38ed1739") return "swapExactTokensForTokens"
	if (hex == "0x8803dbee") return "swapTokensForExactTokens"
	if (hex == "0x5c11d795") return "swapExactTokensForTokensSupportingFeeOnTransferTokens"
	if (hex == '0xac9650d8') return "multicall"
	if (hex == '0x327ec7f6') return "antibotWithV2"
	if (hex == '0x05a3ade4') return "antibotWithV3"
	if (hex == '0x04e45aaf') return "exactInputSingle"
	if (hex == '0x5023b4df') return "exactOutputSingle"
	if (hexLabels[hex]) return hexLabels[hex];
	return hex;
}

const reduceAddy = (addy, labels) => {
	if (labels) {
		for (var key in labels) {
			if (addy.length == 66 && addy.substring(26) == key.substring(2).toLowerCase()) return labels[key];
			if (addy.length == 42 && addy.substring(2).toLowerCase() == key.substring(2).toLowerCase()) return labels[key];
		}
	}
	return addy.length == 66 ? "0x" + addy.substring(26) : "0x" + addy.substring(2).toLowerCase();
}

async function deployContract() {
	const swapContractFactory = await ethers.getContractFactory("Swap");
	const swapContract = await swapContractFactory.deploy()
	return swapContract
}

function decodeMessage(code) {
	try {
		const rlt = ethers.utils.defaultAbiCoder.decode(["string"], "0x" + code.substring(10));
		return rlt[0];
	} catch (err) {
		return "";
	}
}

function sortAddress(addresses) {
	const sortedAddresses = addresses.sort((a, b) => {
		if (ethers.BigNumber.from(a).lt(ethers.BigNumber.from(b))) {
			return -1;
		}
	})
	return sortedAddresses;
}


const v3PMaddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const positionManager = new ethers.Contract(v3PMaddress, v3PositionManagerAbi, waffle.provider);
const FactoryV3 = new ethers.Contract(v3FactoryAddy, v3FactoryAbi, waffle.provider);


async function getV3PoolInfo(quoteToken, tokenToBuy) {
	const fees = [500, 3000, 10000];


	let pools = await Promise.all(fees.map(async (fee) => {
		const poolAddy = await FactoryV3.getPool(quoteToken, tokenToBuy, fee);
		return { address: poolAddy, fee };
	}));

	pools = pools.filter(pool => pool.address !== ethers.constants.AddressZero ? true : false);
	if (pools.length > 0) {
		return pools.pop();
	} else {
		return null;
	}
}

async function main() {
	const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
	let nextBlockNumber = config.blockNumber + 1;
	const labels = {}
	const provider = waffle.provider;
	let poolInfo = await getV3PoolInfo(!config.quoteTokenAddy || WETH, config.tokenAddy)

	for (var i = 0; i < config.setBlances.length; i++) {
		await waffle.provider.send("hardhat_setBalance", [
			config.setBlances[i].address,
			ethers.utils.hexValue(ethers.utils.parseEther(config.setBlances[i].value)),
		]);
		console.log("eth balance of ", config.setBlances[i].address, " ", ethers.utils.parseEther(config.setBlances[i].value), ethers.utils.formatEther(await waffle.provider.getBalance(config.setBlances[i].address)));
	}

	const tokenContract = new ethers.Contract(config.tokenAddy, tokenAbi, waffle.provider);
	const totalSupply = await tokenContract.totalSupply();
	const tokenOwner = await tokenContract.owner().catch(err => {

	});

	const decimals = await tokenContract.decimals();


	if (tokenOwner) labels[tokenOwner] = "owner";
	console.log("totalSupply", totalSupply.toString(), "decimals", decimals);

	if (!config.quoteTokenAddy) config.quoteTokenAddy = WETH;
	let quote_decimals = 18;
	labels[WETH.toLowerCase()] = "WETH";
	const quoteContract = new ethers.Contract(config.quoteTokenAddy, [
		"function decimals() external view returns (uint8)",
		"function approve(address owner, uint amount) external returns (bool)"
	], waffle.provider);

	if (config.quoteTokenAddy != WETH) {
		labels[config.quoteTokenAddy.toLowerCase()] = "QuoteToken";
		quote_decimals = await quoteContract.decimals();
		console.log("quote decimals", quote_decimals);
	}


	const iface = new ethers.utils.Interface(tokenAbi);

	console.log("=================================================================");
	const swapContract = await deployContract();
	await network.provider.send("hardhat_mine");
	nextBlockNumber++;
	let transactions = [];
	const receipts = [];
	for (var i = 0; i < config.simulates.length; i++) {

		const op = config.simulates[i];
		const routerAddy = op.isV3Swap ? uniswapV3Addy : uniswapAddy;

		let txData = {};
		if (op.block_jump) {
			for (var j = 0; j < op.block_jump; j++) {
				await network.provider.send("hardhat_mine");
				if (transactions.length > 0) {

					const block = await waffle.provider.getBlock(nextBlockNumber);
					for (var z = 0; z < block.transactions.length; z++) {
						const txx = await waffle.provider.getTransaction(block.transactions[z]);
						const receipt = await waffle.provider.getTransactionReceipt(block.transactions[z]);
						try {
							var callResult, msg;
							if (receipt.status == 0) {
								//**failed */
								const txPrepare = transactions[z];
								const signer = await getSigner(txPrepare.from);
								callResult = await signer.call({...txPrepare});
								msg = decodeMessage(callResult);
							} else {
								const transfers = receipt.logs.filter(log => {
									if (log.topics.length == 3 && log.topics[0] == "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822") {
										labels[log.address.toLowerCase()] = "pair_address";
									}
									if (log.topics.length == 2 && log.topics[0] == "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
										labels[log.address.toLowerCase()] = "pair_address";
									}

									return log.topics.length >= 1 && log.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && log.topics[1] != "0x0000000000000000000000000000000000000000000000000000000000000000" && log.topics[2] != "0x0000000000000000000000000000000000000000000000000000000000000000";
								}).map(log => {
									if (log.topics.length == 4) {
										return {
											type: "ERC721",
											address: log.address,
											from: reduceAddy(log.topics[1]),
											to: reduceAddy(log.topics[2]),
											tokenId: parseInt(log.topics[3], 16)
										}
									}
									if (log.topics.length == 3) {
										if (log.address == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") {
											return {
												type: "ERC20",
												address: "WETH",
												from: reduceAddy(log.topics[1], labels),
												to: reduceAddy(log.topics[2], labels),
												amount: ethers.utils.formatEther(log.data) + " eth"
											}
										}
										if (log.address.toLowerCase() == config.tokenAddy.toLowerCase()) {
											return {
												type: "ERC20",
												address: "TargetToken",
												from: reduceAddy(log.topics[1], labels),
												to: reduceAddy(log.topics[2], labels),
												amount: (ethers.BigNumber.from(log.data).mul(100000).div(totalSupply) / 1000) + "% " + ethers.BigNumber.from(log.data).toString()
											}
										}
										return {
											type: "ERC20",
											address: reduceAddy(log.address, labels),
											from: reduceAddy(log.topics[1], labels),
											to: reduceAddy(log.topics[2], labels),
											amount: ethers.BigNumber.from(log.data).toString()
										}
									}
								});
								if (transfers.length > 0) {
									console.log("transfers of tx ", receipt.transactionIndex, "(", reduceData(txx.data.substring(0, 10)), ")");
									console.table(transfers);
								}
							}
							receipts.push({
								txId: receipt.transactionIndex,
								blockNumber: receipt.blockNumber,
								gasUsed: receipt.gasUsed.toString(),
								transactionFee: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
								from: reduceAddy(receipt.from, labels),
								hex: reduceData(txx.data.substring(0, 10)),
								status: receipt.status == 0 ? "failed" : "success",
								revert: receipt.status == 0 ? (msg == "" || callResult == "0x" ? "CALL_EXCEPTION transaction failed" : msg) : ""
							});
						} catch (error) {
							console.log(error, receipt);
						}
					}
					transactions = [];
					nextBlockNumber++;
				} else {
					nextBlockNumber++;
					continue;
				}

			}
			continue;
		} else if (op.op_type == "addliquidity") {
			const from = op.from ? op.from : tokenOwner;
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000) : ethers.utils.parseUnits(op.token_amount.toString(), decimals);
			const ethAmount = ethers.utils.parseUnits(op.eth_amount.toString(), quote_decimals);
			const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
			const balances = await uniswapContract.getAmountsOut(100, [config.tokenAddy, config.quoteTokenAddy])
			console.log(balances, 'balances')
			if (config.quoteTokenAddy == WETH) {
				txData = await uniswapContract.populateTransaction.addLiquidityETH(config.tokenAddy, tokenAmount, 0, 0, from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				txData.value = ethAmount;
			} else {
				txData = await uniswapContract.populateTransaction.addLiquidity(config.quoteTokenAddy, config.tokenAddy, ethAmount, tokenAmount, 0, 0, from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
			}
			txData.from = from;
		} else if (op.op_type == "multicall") {
			const poolInfo = await getV3PoolInfo(!config.quoteTokenAddy || WETH, config.tokenAddy)

			if (poolInfo) {
				const reserve = await tokenContract.balanceOf(poolInfo.address);
				if (reserve.gt(ethers.BigNumber.from(0))) {
					continue;
				}
			}

			const from = op.from ? op.from : tokenOwner;
			const tokenAmount = totalSupply.mul(5000).div(10000);
			const ethAmount = ethers.utils.parseUnits('2', 18);
			const tokens = sortAddress([config.tokenAddy, WETH]);
			console.log(tokenAmount)
			const txForCreatPool = positionManager.interface.encodeFunctionData("createAndInitializePoolIfNecessary", [
				tokens[0],
				tokens[1],
				10000,
				encodePriceSqrt(tokens[1] == config.tokenAddy ? tokenAmount : ethAmount, tokens[0] == config.tokenAddy ? tokenAmount : ethAmount)
			])
			const txForAddliquidity = await positionManager.populateTransaction.mint([
				tokens[0],
				tokens[1],
				3000,
				getMinTick(TICK_SPACING.MEDIUM),
				getMaxTick(TICK_SPACING.MEDIUM),
				tokens[0] == config.tokenAddy ? tokenAmount : ethAmount,
				tokens[1] == config.tokenAddy ? tokenAmount : ethAmount,
				0,
				0,
				from,
				Date.now() + 60 * 60
			]);

			const refundETHData = positionManager.interface.encodeFunctionData('refundETH')

			txData = await positionManager.populateTransaction.multicall([
				txForCreatPool,
				txForAddliquidity.data,
				refundETHData
			])

			txData.from = from;
			txData.value = ethAmount
		}
		
		else if (op.op_type == "quote_approve") {
			const from = op.from ? op.from : tokenOwner;
			txData = await quoteContract.populateTransaction.approve(op.router || routerAddy, ethers.constants.MaxUint256);
			txData.from = from;
		} else if (op.op_type == "approve") {
			const from = op.from ? op.from : tokenOwner;
			let to;

			txData = await tokenContract.populateTransaction.approve(op.router || routerAddy, ethers.constants.MaxUint256);
			txData.from = from;
		} else if (op.op_type == "transfer") {
			const from = op.from ? op.from : tokenOwner;
			let to;

			txData = await tokenContract.populateTransaction.transfer(op.to, op.amount);

			txData.from = from;
		} else if (op.op_type == "limitbuy") {
			const from = op.from;

			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000) : ethers.utils.parseUnits(op.token_amount, decimals);
			if (op.isV3Swap == true) {
				const routerV3Contract = new ethers.Contract(op.to || uniswapV3Addy, uniswapv3Abi, provider);
				const poolInfo = await getV3PoolInfo(!config.quoteTokenAddy || WETH, config.tokenAddy);

				if (config.quoteTokenAddy == WETH) {
					txData = await routerV3Contract.populateTransaction.exactOutputSingle([
						WETH,
						config.tokenAddy,
						poolInfo.fee,
						from || ethers.constants.AddressZero,
						Date.now() + 10 * 60 * 1000,
						tokenAmount,
						ethers.utils.parseUnits(op.eth_amount_max),
						0
					]);
					txData.value = ethers.utils.parseEther(op.eth_amount_max);
				} else {
					txData = await routerV3Contract.populateTransaction.exactOutputSingle([
						config.quoteTokenAddy,
						config.tokenAddy,
						poolInfo.fee,
						from || ethers.constants.AddressZero,
						Date.now() + 10 * 60 * 1000,
						tokenAmount,
						ethers.utils.parseUnits(op.eth_amount_max, quote_decimals),
						0
					]);
				}
				txData.from = from;
			} else {

				const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);

				if (config.quoteTokenAddy == WETH) {

					txData = await uniswapContract.populateTransaction.swapETHForExactTokens(tokenAmount, [WETH, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
					txData.value = ethers.utils.parseEther(op.eth_amount_max);
				} else {
					txData = await uniswapContract.populateTransaction.swapTokensForExactTokens(tokenAmount, ethers.utils.parseUnits(op.eth_amount_max, quote_decimals), [config.quoteTokenAddy, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				}
				txData.from = from;
			}
		} else if (op.op_type == "fomobuy") {
			const from = op.from;
			const ethAmount = ethers.utils.parseUnits(op.eth_amount, quote_decimals);

			if (op.isV3Swap == true) {
				const uniswapContract = new ethers.Contract(op.to || uniswapV3Addy, uniswapv3Abi, provider);
				const poolInfo = await getV3PoolInfo(!config.quoteTokenAddy || WETH, config.tokenAddy);
				if (poolInfo == null) {
					console.log("not available v3 swap");
					continue;
				}
				if (config.quoteTokenAddy == WETH) {

					txData = await uniswapContract.populateTransaction.exactInputSingle([
						WETH,
						config.tokenAddy,
						poolInfo.fee,
						from || ethers.constants.AddressZero,
						Date.now() + 10 * 60 * 1000,
						ethAmount,
						0,
						0
					]);
					txData.value = ethAmount;
				} else {
					txData = await uniswapContract.populateTransaction.exactInputSingle([
						config.quoteTokenAddy,
						config.tokenAddy,
						poolInfo.fee,
						from || ethers.constants.AddressZero,
						Date.now() + 10 * 60 * 1000,
						ethAmount,
						0,
						0
					]);
				}
				txData.from = from;
			} else {
				const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);
				if (config.quoteTokenAddy == WETH) {
					txData = await uniswapContract.populateTransaction.swapExactETHForTokens(0, [WETH, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
					txData.value = ethAmount;
				} else {
					txData = await uniswapContract.populateTransaction.swapExactTokensForTokens(ethAmount, 0, [config.quoteTokenAddy, config.tokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				}
				txData.from = from;
			}
		} else if (op.op_type == "antibot") {
			const from = op.from || ethers.constants.AddressZero;
			const tokenAmount = op.amountPerTx.substring(op.amountPerTx.length - 1) == "%" ? totalSupply.mul(op.amountPerTx.substring(0, op.amountPerTx.length - 1) * 100).div(10000) : ethers.utils.parseUnits(op.amountPerTx, decimals);
			if (op.isV3Swap == true) {
				const poolInfo = await getV3PoolInfo(!config.quoteTokenAddy || WETH, config.tokenAddy);
				if (poolInfo == null) {
					console.log("not available v3 swap");
					continue;
				}
				txData = await swapContract
					.populateTransaction
					.v3Swap(
						config.tokenAddy,
						poolInfo.fee,
						tokenAmount,
						3,
						[
							from,
							from,
							from,
						],
					);
				txData.from = from;
				txData.value = ethers.utils.parseEther(op.eth_amount_max);
			} else {
				txData = await swapContract
					.populateTransaction
					.v2Swap(
						config.tokenAddy,
						tokenAmount,
						3,
						[
							from,
							from,
							from,
						],
					);10000000000000
				txData.from = from;
				txData.value = ethers.utils.parseEther(op.eth_amount_max);
				
			}
		} else if (op.op_type == "sell") {
			const from = op.from;
			const tokenAmount = op.token_amount.substring(op.token_amount.length - 1) == "%" ? totalSupply.mul(op.token_amount.substring(0, op.token_amount.length - 1) * 100).div(10000) : ethers.utils.parseUnits(op.token_amount, decimals);
			if (op.isV3Swap == true) {
				const poolInfo = await getV3PoolInfo(!config.quoteTokenAddy || WETH, config.tokenAddy);
				if (poolInfo == null) {
					console.log("not available v3 swap");
					continue;
				}
				const uniswapContract = new ethers.Contract(op.to || uniswapV3Addy, uniswapv3Abi, waffle.provider);
				txData = await uniswapContract.populateTransaction.exactInputSingle([
					config.tokenAddy,
					config.quoteTokenAddy || WETH,
					poolInfo.fee,
					from || ethers.constants.AddressZero,
					Date.now() + 10 * 60 * 1000,
					tokenAmount,
					0,
					0
				]);

			} else {
				const uniswapContract = new ethers.Contract(op.to || uniswapAddy, uniswapAbi, waffle.provider);

				if (config.quoteTokenAddy == WETH) {
					txData = await uniswapContract.populateTransaction.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenAmount, 0, [config.tokenAddy, WETH], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				} else {
					txData = await uniswapContract.populateTransaction.swapExactTokensForTokensSupportingFeeOnTransferTokens(tokenAmount, 0, [config.tokenAddy, config.quoteTokenAddy], from || ethers.constants.AddressZero, Date.now() + 10 * 60 * 1000);
				}
			}
			txData.from = from;
		} else if (op.op_type == "function_call") {
			const from = op.from ? op.from : tokenOwner;
			txData.data = iface.encodeFunctionData(op.function, op.params);
			txData.to = config.tokenAddy;
			if (iface.getFunction(op.function).stateMutability == "view") {
				txData.function = op.function;
			}
			else txData.from = from;
			hexLabels[txData.data.substring(0, 10)] = op.function;
		} else {
			const from = op.from ? op.from : tokenOwner;
			txData = {
				data: op.data,
				to: op.to,
				value: ethers.utils.parseEther(op.value),
				from: from
			}
		}

		if (!txData.from) {
			console.log("you must input from address of op", op.op_type);
			return;
		}

		if (!labels[txData.from]) labels[txData.from] = "from_address";
		if (op.op_type == "addliqidity" || op.op_type == "limitbuy" || op.op_type == "fomobuy" || op.op_type == "sell") {
			labels[txData.to] = "router_address";
		} else if (op.op_type == "approve" || op.op_type == "function_call") {
			labels[txData.to] = "token_address";
		} else {
			if (!labels[txData.to]) labels[txData.to] = "to_address";
		}
		const signer = await getSigner(txData.from);
		const tx = await signer.sendTransaction({ ...txData, gasLimit: op.gasLimit || null }).catch(err => {
			console.log({
				blockNumber: nextBlockNumber,
				transactionIndex: transactions.length,
				from: txData.from,
				to: txData.to,
				data: txData.data.substring(0, 10),
				code: err.code,
				method: err.method,
				reason: err.reason,
				message: err.message

			})
		});

		transactions.push(txData);

	}

	await network.provider.send("hardhat_mine");

	if (transactions.length > 0) {
		const block = await waffle.provider.getBlock(nextBlockNumber);

		for (var z = 0; z < block.transactions.length; z++) {
			const txx = await waffle.provider.getTransaction(block.transactions[z]);
			const receipt = await waffle.provider.getTransactionReceipt(block.transactions[z]);
			try {
				var callResult, msg;
				if (receipt.status == 0) {
					//**failed */
					const txPrepare = transactions[z];
					const signer = await getSigner(txPrepare.from);

					callResult = await signer.call(txPrepare);
					msg = decodeMessage(callResult);
					// console.error("error=> "receipt)
				} else {
					const transfers = receipt.logs.filter(log => {
						if (log.topics.length == 3 && log.topics[0] == "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822") {
							labels[log.address.toLowerCase()] = "pair_address";
						}
						if (log.topics.length == 2 && log.topics[0] == "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
							labels[log.address.toLowerCase()] = "pair_address";
						}

						return log.topics.length >= 1 && log.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && log.topics[1] != "0x0000000000000000000000000000000000000000000000000000000000000000" && log.topics[2] != "0x0000000000000000000000000000000000000000000000000000000000000000";
					}).map(log => {
						if (log.topics.length == 4) {
							return {
								type: "ERC721",
								address: log.address,
								from: reduceAddy(log.topics[1]),
								to: reduceAddy(log.topics[2]),
								tokenId: parseInt(log.topics[3], 16)
							}
						}
						if (log.topics.length == 3) {
							if (log.address == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") {
								return {
									type: "ERC20",
									address: "WETH",
									from: reduceAddy(log.topics[1], labels),
									to: reduceAddy(log.topics[2], labels),
									amount: ethers.utils.formatEther(log.data) + " eth"
								}
							}
							if (log.address.toLowerCase() == config.tokenAddy.toLowerCase()) {
								return {
									type: "ERC20",
									address: "TargetToken",
									from: reduceAddy(log.topics[1], labels),
									to: reduceAddy(log.topics[2], labels),
									amount: (ethers.BigNumber.from(log.data).mul(100000).div(totalSupply) / 1000) + "% " + ethers.BigNumber.from(log.data).toString()
								}
							}
							return {
								type: "ERC20",
								address: reduceAddy(log.address, labels),
								from: reduceAddy(log.topics[1], labels),
								to: reduceAddy(log.topics[2], labels),
								amount: ethers.BigNumber.from(log.data).toString()
							}
						}
					});
					if (transfers.length > 0) {
						console.table(transfers);
					}
				}
				receipts.push({
					txId: receipt.transactionIndex,
					blockNumber: receipt.blockNumber,
					gasUsed: receipt.gasUsed.toString(),
					transactionFee: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
					from: reduceAddy(receipt.from, labels),
					hex: reduceData(txx.data.substring(0, 10)),
					status: receipt.status == 0 ? "failed" : "success",
					revert: receipt.status == 0 ? (msg == "" || callResult == "0x" ? "CALL_EXCEPTION transaction failed" : msg) : ""
				});
			} catch (error) {
				console.log(error, receipt);
			}
		}
		transactions = [];
		nextBlockNumber++;
	}
	console.table(receipts);
	// console.log(errs);
}



// deployContract();
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});