import { SmsLog } from "@/app/types/sms";

async function getSmsLogs(): Promise<SmsLog[]> {
  const res = await fetch(
    "http://localhost:3000/api/sms-logs",
    {
      cache: "no-store",
    }
  );

  const data = await res.json();

  return data.data;
}

export default async function Home() {
  const logs = await getSmsLogs();

  return (
    <main className="p-8">

      <h1 className="text-2xl font-bold mb-6">
        Warranty SMS History
      </h1>

      <div className="border rounded-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">
                Customer
              </th>

              <th className="p-3 text-left">
                Phone
              </th>

              <th className="p-3 text-left">
                Product
              </th>

              <th className="p-3 text-left">
                Status
              </th>

              <th className="p-3 text-left">
                Date
              </th>
            </tr>
          </thead>


          <tbody>

          {logs.map((sms)=>(
            <tr
              key={sms.id}
              className="border-t"
            >

              <td className="p-3">
                {sms.name}
              </td>

              <td className="p-3">
                {sms.phone}
              </td>

              <td className="p-3">
                {sms.brand} {sms.model}
              </td>

              <td className="p-3">
                {sms.status}
              </td>

              <td className="p-3">
                {new Date(
                  sms.sentAt
                ).toLocaleDateString()}
              </td>

            </tr>
          ))}

          </tbody>

        </table>

      </div>

    </main>
  );
} 