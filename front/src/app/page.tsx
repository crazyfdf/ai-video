"use client";

import { useState } from "react";
import AIImageGenerator from "./image";

import VideoGenerator from "./video";
import Models from "@/app/init";

export default function Home() {
    const [activeTab, setActiveTab] = useState("image");

    return (
        <div style={styles.container}>
            <div style={styles.sidebar}>
                <div style={styles.item} onClick={() => setActiveTab("models")}>
                    初始化
                </div>


                <div style={styles.item} onClick={() => setActiveTab("image")}>
                    提取图像
                </div>
                <div style={styles.item} onClick={() => setActiveTab("video")}>
                    生成视频
                </div>
            </div>
            <div style={styles.content}>

                {activeTab === "image" && <AIImageGenerator/>}
                {activeTab === "video" && <VideoGenerator/>}
                {activeTab === "models" && <Models/>}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        height: "100vh",
    },
    sidebar: {
        width: "200px",
        padding: "10px",
        boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
    },
    item: {
        padding: "10px",
        margin: "5px 0",
        cursor: "pointer",
        borderRadius: "5px",
        transition: "background-color 0.3s",
    },
    content: {
        flex: 1,
        padding: "20px",
    },
};
