// pages/index.tsx

import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import abi from "../src/Voting.json";
import { ethers } from "ethers";

import dayjs from "dayjs";
import {
  AppBar,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
} from "@mui/material";

interface CandidateResult {
  name: string;
  candidateAddress: string;
  voteCount: number;
}
const CONTRACT_ADDRESS = "0x87350eE91d1B939B29d2BE0427aD7761A8B92B95";

export default function Home() {
  const [address, setAddress] = useState();
  const [candidateResults, setCandidateResults] = useState<CandidateResult[]>(
    []
  );
  const [endTime, setEndTime] = useState<string>();
  const [loading, setLoading] = useState(false);

  const connectToTheMetaMask = useCallback(async () => {
    // check if the browser has MetaMask installed
    if (!(window as any).ethereum) {
      alert("Please install MetaMask first.");
      return;
    }
    // get the user's account address
    const accounts = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
    setAddress(accounts[0]);
  }, []);

  const signer = useMemo(() => {
    if (!address) return null;
    return new ethers.providers.Web3Provider(
      (window as any).ethereum
    ).getSigner();
  }, [address]);

  const provider = useMemo(() => {
    // only connect to the contract if the user has MetaMask installed
    if (typeof window === "undefined") return null;
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }, []);

  // function will be called whenever the address changed
  useEffect(() => {
    if (provider) {
      (async () => {
        // get latest candidate names
        const ballotContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          abi.abi,
          provider
        );

        // get the list of candidates
        const results = await ballotContract.getResults();
        const endTime = ethers.utils.formatUnits(
          await ballotContract.endTime(),
          0
        );
        setEndTime(dayjs.unix(parseInt(endTime)).format("YYYY-MM-DD HH:mm:ss"));
        setCandidateResults(results);
      })();
    }
  }, [provider, loading]);

  const registerAsCandidate = useCallback(async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const ballotContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi.abi,
        signer
      );
      // show a pop-up to the user to confirm the transaction
      const name = prompt("Please enter your name");
      if (!name) return;
      const tx = await ballotContract.registerCandidate(name);
      // wait for the transaction to be mined
      await tx.wait();
    } catch (e) {
      // show any error using the alert box
      alert(`Error: ${e}`);
    }
    setLoading(false);
  }, [signer]);

  const vote = useCallback(
    async (index: number) => {
      if (!signer) return;
      setLoading(true);
      try {
        const ballotContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          abi.abi,
          signer
        );
        const tx = await ballotContract.vote(index);
        await tx.wait();
      } catch (e) {
        console.error(e, index);
        window.alert(`${e}`);
      }
      setLoading(false);
    },
    [signer]
  );

  const reset = useCallback(async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const ballotContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi.abi,
        signer
      );
      const endTime = prompt("Please enter the end time in hours");
      if (endTime) {
        const parsedEndTime = parseInt(endTime);
        const tx = await ballotContract.reset(parsedEndTime * 3600);
        await tx.wait();
      }
    } catch (e) {
      window.alert(`${e}`);
    }
    setLoading(false);
  }, [signer]);

  return (
    <div style={{ padding: 20 }}>
      <AppBar>
        <Toolbar>
          <Typography variant="h6">Voting</Typography>
        </Toolbar>
      </AppBar>
      {loading && <CircularProgress />}
      {/* Connect to metamask button */}
      <div style={{ marginTop: 62 }}>
        <Typography variant="caption" style={{ paddingRight: 10 }}>
          Address:{" "}
        </Typography>
        {!address ? (
          <Button onClick={connectToTheMetaMask}>Connect to the website</Button>
        ) : (
          <span>{address}</span>
        )}
      </div>
      {/* End time */}
      <div>
        <Typography variant="subtitle2" style={{ paddingRight: 10 }}>
          End time: {endTime}
        </Typography>
      </div>

      {/** Table for all candidates */}
      <Table style={{ marginTop: 20 }}>
        <TableHead>
          <TableRow>
            <TableCell>Candidate Name</TableCell>
            <TableCell>Candidate Address</TableCell>
            <TableCell>Vote Count</TableCell>
            <TableCell>Vote</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {candidateResults.map((candidateResult, index) => (
            <TableRow key={candidateResult.candidateAddress}>
              <TableCell>{candidateResult.name}</TableCell>
              <TableCell>{candidateResult.candidateAddress}</TableCell>
              <TableCell>
                {ethers.utils.formatUnits(candidateResult.voteCount, 0)}
              </TableCell>
              <TableCell>
                <button disabled={!address} onClick={() => vote(index)}>
                  Vote
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div style={{ marginTop: 20 }}>
        <Button disabled={!address} onClick={registerAsCandidate}>
          Register as a candidate
        </Button>
        <Button disabled={!address} onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
