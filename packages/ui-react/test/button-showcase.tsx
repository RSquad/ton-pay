import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useTonPay } from "../src/hooks/useTonPay";
import { TonPayButton } from "../src/components/ton-pay-btn";
import { NotificationRoot } from "../src/components/notification/Notification";
import { ErrorTransactionNotification } from "../src/components/notification/ErrorTransactionNotification";
import { createTonPayTransfer } from "../../api/src";

const ButtonDemo = ({ label, code, children }: { label: string; code: string; children: any }) => (
    <div className="button-demo">
        <div className="button-label">{label}</div>
        <div className="button-wrapper">{children}</div>
        <div className="code">{code}</div>
    </div>
);

const App = () => {
    const { pay } = useTonPay();
    const [errorText, setErrorText] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        if (!errorText) return;
        const t = setTimeout(() => setErrorText(null), 3500);
        return () => clearTimeout(t);
    }, [errorText]);

    const parseError = (e: any): string => {
        const raw = (e && (e.message || e.reason || e.error || e.toString?.())) || String(e);
        if (typeof raw !== "string") return "Operation failed";
        const m = raw.match(/SendTransactionRequest[^\n]+/i);
        if (m) return m[0];
        return raw.replace(/^_?TonConnectError:\s*/i, "").split("\n")[0];
    };
    const handlePay = async () => {
        if (isPaying) return;
        setIsPaying(true);
        try {
            const result = await pay(async (senderAddr: string) => {
                const { message, reference, bodyBase64Hash } = await createTonPayTransfer(
                    {
                        amount: 3.5,
                        asset: "TON",
                        recipientAddr: "EQC........................................RECIPIENT",
                        senderAddr,
                        commentToSender: "Cart #8451",
                    },
                    { chain: "mainnet" }
                );
                return { message, reference, bodyBase64Hash };
            });
            console.log("Sent:", result.txResult);
            console.log("Tracking:", result.reference, result.bodyBase64Hash);
            console.log("Payload base64:", result.message.payload);
        } catch (e) {
            console.log("Demo pay error (expected in showcase without valid data):", e);
            setErrorText(parseError(e));
        } finally {
            setIsPaying(false);
        }
    };

    const Btn = (props: any) => <TonPayButton {...props} isLoading={isPaying} />;

    return (
            <div className="container">
                <NotificationRoot>
                    {errorText && (
                        <ErrorTransactionNotification text={errorText} />
                    )}
                </NotificationRoot>
                <div className="section">
                    <div className="section-title">Default Option</div>
                    <div className="grid">
                        <ButtonDemo label="Long + Rounded (8px)" code='borderRadius={8}'>
                            <Btn borderRadius={8} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Rounded (8px)" code='variant="short" borderRadius={8}'>
                            <Btn variant="short" borderRadius={8} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Long + Square (0px)" code='borderRadius={0}'>
                            <Btn borderRadius={0} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Square (0px)" code='variant="short" borderRadius={0}'>
                            <Btn variant="short" borderRadius={0} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Long + Pill (99px)" code='borderRadius={99}'>
                            <Btn borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Pill (99px)" code='variant="short" borderRadius={99}'>
                            <Btn variant="short" borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">Preset 1: Gradient</div>
                    <div className="grid">
                        <ButtonDemo label="Long + Rounded (8px)" code='preset="gradient" borderRadius={8}'>
                            <Btn preset="gradient" borderRadius={8} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Rounded (8px)" code='preset="gradient" variant="short" borderRadius={8}'>
                            <Btn preset="gradient" variant="short" borderRadius={8} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Long + Square (0px)" code='preset="gradient" borderRadius={0}'>
                            <Btn preset="gradient" borderRadius={0} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Square (0px)" code='preset="gradient" variant="short" borderRadius={0}'>
                            <Btn preset="gradient" variant="short" borderRadius={0} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Long + Pill (99px)" code='preset="gradient" borderRadius={99}'>
                            <Btn preset="gradient" borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Pill (99px)" code='preset="gradient" variant="short" borderRadius={99}'>
                            <Btn preset="gradient" variant="short" borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">Preset 2: Black Theme</div>
                    <div className="grid">
                        <ButtonDemo label="Long + Rounded (8px)" code='bgColor="#000000" borderRadius={8}'>
                            <Btn bgColor="#000000" textColor="#FFFFFF" borderRadius={8} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Rounded (8px)" code='bgColor="#000000" variant="short" borderRadius={8}'>
                            <Btn bgColor="#000000" textColor="#FFFFFF" variant="short" borderRadius={8} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Long + Pill (99px)" code='bgColor="#000000" borderRadius={99}'>
                            <Btn bgColor="#000000" textColor="#FFFFFF" borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Short + Pill (99px)" code='bgColor="#000000" variant="short" borderRadius={99}'>
                            <Btn bgColor="#000000" textColor="#FFFFFF" variant="short" borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">Custom Styles</div>
                    <div className="grid">
                        <ButtonDemo label="Purple Theme" code='bgColor="#7C3AED" textColor="#FFFFFF"'>
                            <Btn bgColor="#7C3AED" textColor="#FFFFFF" handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Green Theme" code='bgColor="#10B981" textColor="#FFFFFF"'>
                            <Btn bgColor="#10B981" textColor="#FFFFFF" variant="short" handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Red Theme" code='bgColor="#EF4444" textColor="#FFFFFF"'>
                            <Btn bgColor="#EF4444" textColor="#FFFFFF" borderRadius={99} handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Large Size" code='width={400} height={56}'>
                            <Btn width={400} height={56} preset="gradient" handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Compact Size" code='width={200} height={36}'>
                            <Btn width={200} height={36} variant="short" handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Custom Font" code='preset="gradient" fontFamily="Michroma"'>
                            <Btn preset="gradient" fontFamily="'Michroma', system-ui, sans-serif" handlePay={handlePay} />
                        </ButtonDemo>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">Without Menu</div>
                    <div className="grid">
                        <ButtonDemo label="Default Long + Menu" code='showMenu={false}'>
                            <Btn showMenu handlePay={handlePay} />
                        </ButtonDemo>
                        <ButtonDemo label="Default Short + Menu" code='variant="short" showMenu={false}'>
                            <Btn variant="short" showMenu={false} handlePay={handlePay} />
                        </ButtonDemo>
                        <ButtonDemo label="Gradient Long + Menu" code='preset="gradient" showMenu={false}'>
                            <Btn preset="gradient" showMenu={false} handlePay={handlePay} />
                        </ButtonDemo>
                        <ButtonDemo label="Gradient Short + Menu" code='preset="gradient" variant="short" showMenu={false}'>
                            <Btn preset="gradient" variant="short" showMenu={false} handlePay={handlePay} />
                        </ButtonDemo>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">States</div>
                    <div className="grid">
                        <ButtonDemo label="Loading State" code='isLoading={true} loadingText="Processing..."'>
                            <TonPayButton isLoading={true} loadingText="Processing..." handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Disabled State" code='disabled={true}'>
                            <TonPayButton disabled={true} preset="gradient" handlePay={handlePay} />
                        </ButtonDemo>

                        <ButtonDemo label="Loading (Gradient)" code='isLoading={true} preset="gradient"'>
                            <TonPayButton isLoading={true} loadingText="Please wait..." preset="gradient" variant="short" handlePay={handlePay} />
                        </ButtonDemo>
                    </div>
                </div>
            </div>
    );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
    <TonConnectUIProvider manifestUrl="https://ton-connect.github.io/demo-dapp-with-wallet/tonconnect-manifest.json">
        <App />
    </TonConnectUIProvider>
);

