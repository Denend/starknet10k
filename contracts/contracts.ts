import { tokenABI } from "./tokenABI"

interface Token {
    contractAddress: string
    ABI: any[]
    decimals: number
}

export type Tokens = keyof Contracts

export class Contracts {
    public USDT: Token = {contractAddress: '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8', ABI: tokenABI, decimals: 6}
    public USDC: Token = {contractAddress: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', ABI: tokenABI, decimals: 6}
}

// console.log(c.USDT)