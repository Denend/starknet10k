

import { Trade, Token, Route, Pair, StarknetChainId, TokenAmount, TradeType, Fetcher, Percent } from 'l0k_swap-sdk'
import { Account, Contract, Provider, constants, ec, number, transaction, uint256 } from "starknet";
import { Contracts, Tokens } from './contracts/contracts';
import { routerABI } from './contracts/contractABI';
import { makeDenominator } from './utils/makedenominator';
import { config } from './config'
import { read } from './utils/read';

class _10kSwap {
    provider: Provider
    contracts: Contracts

    constructor(

    ) {
        this.provider = new Provider({ sequencer: { network: constants.StarknetChainId.MAINNET } })
        this.contracts = new Contracts
    }

    async waitForTransaction(tx: string) {
        try {
            const provider = new Provider({ sequencer: { network: 'mainnet-alpha' } })
            const res = await provider.waitForTransaction(tx, 1000)
            return true
        } catch(e: any) {
            console.log(e.response)
            return false
        }
    }

    async approve(account: Account, token: Tokens, amount: string, spender: string) {
        const contractAddress = this.contracts[token].contractAddress
        const ABI = this.contracts[token].ABI
        const contract = new Contract(ABI, contractAddress)        
        contract.connect(account)

        const res = await contract.approve(spender, amount)
        if(await this.waitForTransaction(res.transaction_hash)) console.log(`Выполнен аппрув | ${res.transaction_hash} |${account.address}`)
        else console.log(`Не удалось выполнить аппрув ${res.transaction_hash} | ${account.address}`)
    }

    async buildSwapTx(account: Account, firstToken: Tokens, secondToken: Tokens, amount: any, slippage: {nominator: number, denominator: number}) {
        const NOT = new Token(StarknetChainId.MAINNET, this.contracts[secondToken].contractAddress, this.contracts[secondToken].decimals)
        const HOT = new Token(StarknetChainId.MAINNET, this.contracts[firstToken].contractAddress, this.contracts[firstToken].decimals)
        const HOT_NOT = await Fetcher.fetchPairData(NOT, HOT)
        const NOT_TO_HOT = new Route([HOT_NOT], HOT)
        const trade = new Trade(NOT_TO_HOT, new TokenAmount(HOT, amount.low.toString()), TradeType.EXACT_INPUT)
        
        const amountIn = this.getUint256(trade.inputAmount.numerator[0])
        //slippage
        const amountOutMin = this.getUint256(trade.minimumAmountOut(new Percent(slippage.nominator.toString(), slippage.denominator.toString())).numerator[0])
        const path_len = trade.route.path.length
        const path = trade.route.path.map(el => el.address)
        const to = account.address
        const deadline = Math.round((new Date).getTime()/1000) + 2*60*60
        return {amountIn: amountIn, amountOutMin: amountOutMin, path_len: path_len, path: path, to: to, deadline: deadline}
    }

    async swap(account: Account, firstToken: Tokens, secondToken: Tokens, amount: any, spender: string, slippage: {nominator: number, denominator: number}) {
        const contractAddress = '0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1'
        const ABI = routerABI
        const contract = new Contract(ABI, contractAddress)        
        contract.connect(account)

        const allowance = await this.getAllowance(account, firstToken, spender)
        if(uint256.uint256ToBN(allowance) < uint256.uint256ToBN(amount)) {
            await this.approve(account, firstToken, amount, spender)
        }
        
        const {amountIn, amountOutMin, path, to, deadline} = await this.buildSwapTx(account, firstToken, secondToken, amount, slippage)
        const res = await contract.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)
        if(await this.waitForTransaction(res.transaction_hash)) console.log(`Выполнен свап | ${res.transaction_hash} | ${account.address}`);
        else console.log(`Не удалось выполнить свап ${res.transaction_hash} | ${account.address}`)
    }

    async getAllowance(account: Account, token: Tokens, spender: string) {
        const contractAddress = this.contracts[token].contractAddress
        const ABI = this.contracts[token].ABI
        const contract = new Contract(ABI, contractAddress)        
        contract.connect(account)
        const allowance = await contract.allowance(account.address, spender)
        return allowance[0]
    }

    async getBalanceOf(account: Account, token: Tokens) {
        const contractAddress = this.contracts[token].contractAddress
        const ABI = this.contracts[token].ABI
        const contract = new Contract(ABI, contractAddress)        
        contract.connect(account)
        const balance = await contract.balanceOf(account.address)
        return balance[0]
    }

    getUint256(_number: string) {
        return uint256.bnToUint256(number.toBN(_number))
    }
}

async function main() {
    const contracts = new Contracts()
    const provider = new Provider({ sequencer: { network: 'mainnet-alpha' } })
    const _10k = new _10kSwap()

    const privates = await read('privates.txt')
    const addresses = await read('addresses.txt')

    for(let [i, privateKey] of privates.entries()) {
        const account = new Account(provider, addresses[i], ec.getKeyPair(privateKey))

        const routerAddress = '0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1'
        const balance = await _10k.getBalanceOf(account, config.firstToken)
        
        await _10k.swap(account, config.firstToken, config.secondToken, balance, routerAddress, makeDenominator(config.slippage))
    }
}

main()