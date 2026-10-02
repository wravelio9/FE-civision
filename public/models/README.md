# YOLO model

Put the exported model here:

```
public/models/best.onnx
```

The frontend loads it at runtime from `/models/best.onnx` (see
`src/services/yolo/config.js`). It is loaded once and the inference session is
reused for every image.

## How to generate best.onnx

In the AI (Python) project, run the provided export script, e.g.:

```
python export_onnx.py
```

Then copy the resulting `best.onnx` into this folder.

## Expected model spec (must match the exported model)

- Input: name `images`, float32, `[1, 3, 640, 640]` NCHW, RGB, pixel/255,
  letterbox to 640x640 with padding value 114.
- Output: float32, `[1, 5, 8400]` = `[1, 4+nc, N]`, nc = 1 (xywh centre in 640
  space, class confidence, no objectness, no NMS).
- Class: `0 = gerobak` (PKL).

## Security note

This model is intentionally client-side. `best.onnx` is downloaded by the
browser and is therefore accessible to anyone using the app. Do not treat it as
secret. No fake obfuscation is applied.
