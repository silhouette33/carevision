from fastapi import FastAPI

app = FastAPI(title="CareVision AI Server")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "CareVision AI Server is running"}
