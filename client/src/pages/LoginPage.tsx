import { Alert, Button, Form, Input, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login, isLoginLoading } = useAuth({ checkSession: false });
  const [error, setError] = useState("");

  const submit = async (values: { username: string; password: string }) => {
    setError("");

    try {
      await login(values);
      message.success("Sistemə giriş edildi");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Giriş mümkün olmadı");
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-emblem">DR</div>
        <div className="login-kicker">Azərbaycan Respublikası</div>
        <h1>Daşınmaz Əmlakın Dövlət Kadastrı və Reyestri</h1>
      </div>

      <div className="login-card">
        <h2>Sistemə giriş</h2>
        <p className="muted">İdarə panelinə daxil olmaq üçün məlumatları yazın.</p>

        {error && <Alert type="error" message={error} showIcon className="login-alert" />}

        <Form layout="vertical" onFinish={submit} initialValues={{ username: "admin", password: "admin" }}>
          <Form.Item name="username" label="İstifadəçi adı" rules={[{ required: true, message: "İstifadəçi adını yazın" }]}>
            <Input size="large" prefix={<UserOutlined />} placeholder="admin" />
          </Form.Item>

          <Form.Item name="password" label="Şifrə" rules={[{ required: true, message: "Şifrəni yazın" }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="admin" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={isLoginLoading}>Daxil ol</Button>
        </Form>
      </div>
    </div>
  );
}
