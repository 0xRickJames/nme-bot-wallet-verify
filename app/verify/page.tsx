"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const NEXT_PUBLIC_DISCORD_CLIENT_ID =
  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
const NEXT_PUBLIC_REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!;
const NEXT_PUBLIC_API_ADDRESS = process.env.NEXT_PUBLIC_API_ADDRESS!;

function VerifyComponent() {
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("user");
  const discordCode = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const userId = stateParam || urlUserId;

  const [wallet, setWallet] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [discordUser, setDiscordUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [discordStatus, setDiscordStatus] = useState("❌ Not logged in");
  const [walletStatus, setWalletStatus] = useState("❌ Not connected");
  const [signStatus, setSignStatus] = useState("❌ Not signed");
  const [verifyStatus, setVerifyStatus] = useState("❌ Not verified");

  useEffect(() => {
    if (!userId) {
      setDiscordStatus("❌ Invalid verification link.");
      return;
    }
    if (discordCode) {
      exchangeDiscordCode(discordCode);
    }
  }, [userId, discordCode]);

  const exchangeDiscordCode = async (code: string) => {
    try {
      const response = await axios.post(
        `${NEXT_PUBLIC_API_ADDRESS}/discord-auth`,
        { code }
      );
      setDiscordUser(response.data);
      setDiscordStatus(`✅ Logged in as ${response.data.username}`);
    } catch (error) {
      console.error(error);
      setDiscordStatus("❌ Discord authentication failed.");
    }
  };

  const discordLoginUrl = `https://discord.com/oauth2/authorize?client_id=${NEXT_PUBLIC_DISCORD_CLIENT_ID}&NEXT_PUBLIC_REDIRECT_URI=${encodeURIComponent(
    NEXT_PUBLIC_REDIRECT_URI
  )}&response_type=code&scope=identify&state=${encodeURIComponent(
    userId || ""
  )}`;

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletStatus("❌ No crypto wallet found. Please install MetaMask.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider
      );
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
      setWalletStatus(
        `✅ Wallet connected:\n${address.slice(0, 6)}...${address.slice(-4)}`
      );
    } catch (error) {
      console.error(error);
      setWalletStatus("❌ Failed to connect wallet.");
    }
  };

  const signMessage = async () => {
    if (!wallet) {
      setSignStatus("❌ Connect your wallet first.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider
      );
      const signer = await provider.getSigner();
      const message = `Verify your wallet for Discord: ${userId}`;
      const signedMessage = await signer.signMessage(message);
      setSignature(signedMessage);
      setSignStatus("✅ Signed successfully!");
    } catch (error) {
      console.error(error);
      setSignStatus("❌ Signing failed.");
    }
  };

  const verifyWallet = async () => {
    if (!wallet || !signature || !userId || !discordUser) {
      setVerifyStatus("❌ Sign the message and log in with Discord first.");
      return;
    }
    try {
      const response = await axios.post(
        `${NEXT_PUBLIC_API_ADDRESS}/verify-wallet`,
        {
          userId,
          discordId: discordUser.id,
          wallet,
          signature,
        }
      );
      setVerifyStatus(
        response.data.message || `✅ Wallet verified successfully!`
      );
    } catch (error) {
      console.error(error);
      setVerifyStatus("❌ Verification failed.");
    }
  };

  return (
    <div className="flex flex-col items-center text-center justify-center min-h-screen bg-gray-900 text-gray-300 px-6">
      <h1 className="text-4xl font-bold mb-4">NME Bot</h1>
      <h2 className="text-2xl font-semibold mb-6">Verify Your Wallet</h2>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <p className="text-lg mb-4">
          Follow these steps to verify your wallet:
        </p>

        {/* Buttons Section with Individual Status */}
        <div className="flex flex-col gap-4 mt-3">
          <ol className="list-decimal list-inside text-gray-300 space-y-2">
            <div>
              {/* Discord Login */}
              <div>
                <li className="p-2">Sign into Discord</li>
                <a
                  href={discordLoginUrl}
                  className={`px-6 py-2 rounded-lg text-center block ${
                    discordUser
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-indigo-500 hover:bg-indigo-600"
                  }`}
                  onClick={(e) => discordUser && e.preventDefault()}
                >
                  {discordUser ? `${discordStatus}` : "Login with Discord"}
                </a>
              </div>
            </div>
            {/* Connect Wallet */}
            <div>
              <li className="p-2">Connect your wallet</li>
              <button
                onClick={connectWallet}
                className={`px-6 py-2 rounded-lg w-full ${
                  wallet
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                disabled={!!wallet}
              >
                {wallet ? `${walletStatus}` : "Connect"}
              </button>
            </div>

            {/* Sign Message */}
            <div>
              <li>Sign a message to verify your identity</li>
              <button
                onClick={signMessage}
                className={`px-6 py-2 rounded-lg w-full ${
                  !wallet
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
                disabled={!wallet}
              >
                Sign Message
              </button>
              <p className="text-sm mt-1">{signStatus}</p>
            </div>

            {/* Verify Wallet */}
            <div>
              <li>Verify that it worked</li>
              <button
                onClick={verifyWallet}
                className={`px-6 py-2 rounded-lg w-full ${
                  !wallet || !signature || !discordUser
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-purple-500 hover:bg-purple-600"
                }`}
                disabled={!wallet || !signature || !discordUser}
              >
                Verify Wallet
              </button>
              <p className="text-sm mt-1">{verifyStatus}</p>
            </div>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ✅ Wrap everything in Suspense to avoid Next.js errors
export default function Verify() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <VerifyComponent />
    </Suspense>
  );
}
