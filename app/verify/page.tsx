"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import axios from "axios";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;

export default function Verify() {
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("user"); // ✅ Preserved userId from URL
  const discordCode = searchParams.get("code"); // ✅ Discord OAuth code from URL
  const stateParam = searchParams.get("state"); // ✅ Retrieve userId from state after OAuth
  const userId = stateParam || urlUserId; // ✅ Use state userId if it exists, fallback to URL userId

  const [wallet, setWallet] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [discordUser, setDiscordUser] = useState<{
    id: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) {
      setStatus("❌ Invalid verification link.");
      return;
    }

    // ✅ If user just logged in via Discord, exchange the OAuth code
    if (discordCode) {
      exchangeDiscordCode(discordCode);
    }
  }, [userId, discordCode]);

  const exchangeDiscordCode = async (code: string) => {
    try {
      const response = await axios.post("http://localhost:3001/discord-auth", {
        code,
      });

      setDiscordUser(response.data);
      setStatus(`✅ Logged in as ${response.data.username}`);
    } catch (error) {
      console.error(error);
      setStatus("❌ Discord authentication failed.");
    }
  };

  // ✅ Modify Discord Login URL to Include userId inside `state`
  const discordLoginUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=identify&state=${encodeURIComponent(
    userId || ""
  )}`;

  const connectWallet = async () => {
    const ethereum = window.ethereum as unknown as ethers.Eip1193Provider;
    if (!ethereum) {
      setStatus("❌ No crypto wallet found. Please install MetaMask.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
      setStatus("✅ Wallet connected!");
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to connect wallet.");
    }
  };

  const signMessage = async () => {
    if (!wallet) {
      setStatus("❌ Connect your wallet first.");
      return;
    }

    try {
      const ethereum = window.ethereum as unknown as ethers.Eip1193Provider;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const message = `Verify your wallet for Discord: ${userId}`;
      const signedMessage = await signer.signMessage(message);
      setSignature(signedMessage);
      setStatus("✅ Signed successfully!");
    } catch (error) {
      console.error(error);
      setStatus("❌ Signing failed.");
    }
  };

  const verifyWallet = async () => {
    if (!wallet || !signature || !userId || !discordUser) {
      setStatus("❌ Sign the message and log in with Discord first.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:3001/verify-wallet", {
        userId,
        discordId: discordUser.id,
        wallet,
        signature,
      });

      setStatus(response.data.message || "✅ Wallet verified successfully!");
    } catch (error) {
      console.error(error);
      setStatus("❌ Verification failed.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Verify Your Wallet</h1>

      {!discordUser ? (
        <a
          href={discordLoginUrl}
          className="mt-4 px-6 py-2 bg-indigo-500 rounded-lg"
        >
          Login with Discord
        </a>
      ) : (
        <p className="mt-2">Logged in as {discordUser.username}</p>
      )}

      <button
        onClick={connectWallet}
        className="mt-4 px-6 py-2 bg-blue-500 rounded-lg"
      >
        {wallet ? "Wallet Connected" : "Connect Wallet"}
      </button>

      {wallet && (
        <>
          <p className="mt-2">Connected: {wallet}</p>
          <button
            onClick={signMessage}
            className="mt-4 px-6 py-2 bg-green-500 rounded-lg"
          >
            Sign Message
          </button>
        </>
      )}

      {signature && (
        <>
          <p className="mt-2">Signature: {signature.substring(0, 10)}...</p>
          <button
            onClick={verifyWallet}
            className="mt-4 px-6 py-2 bg-purple-500 rounded-lg"
          >
            Verify Wallet
          </button>
        </>
      )}

      {status && <p className="mt-4 text-yellow-400">{status}</p>}
    </div>
  );
}
