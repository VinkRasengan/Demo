FROM python:3.11-slim-bookworm

WORKDIR /app
COPY app.py .
# Chỉ lab cô lập — mô phỏng lỗi như mô tả trong báo cáo (không phải bản Maltrail chính thức)
EXPOSE 8338
CMD ["python", "-u", "app.py"]
