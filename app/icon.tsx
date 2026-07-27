import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 4,
          padding: "16px 12px",
          borderRadius: 15,
          color: "#080a08",
          background: "#d8ff4f",
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              width: 7,
              height: index === 2 ? 32 : 25,
              marginTop: index === 2 ? 7 : 0,
              borderRadius: 4,
              background: "#080a08",
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
