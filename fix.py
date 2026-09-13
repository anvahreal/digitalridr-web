import re

path = r'src\pages\AdminDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace import
content = content.replace('    Cell,\n    Pie,\n    PieChart,', '    Cell,\n    Legend,\n    Pie,\n    PieChart,')

# Replace pie chart using regex
pattern = re.compile(r'<ResponsiveContainer width="100%" height="100%">.*?<PieChart>.*?</PieChart>.*?</ResponsiveContainer>', re.DOTALL)

new_pie = '''{(() => {
                                            const COLORS = ['#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#06b6d4', '#f43f5e', '#eab308'];
                                            const locationData = listings.reduce((acc: any[], curr) => {
                                                const existing = acc.find((item: any) => item.name === curr.location);
                                                if (existing) existing.value++;
                                                else acc.push({ name: curr.location || 'Unknown', value: 1 });
                                                return acc;
                                            }, []);
                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={locationData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={50}
                                                            outerRadius={70}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {locationData.map((_entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Legend
                                                            layout="vertical"
                                                            align="right"
                                                            verticalAlign="middle"
                                                            iconType="circle"
                                                            iconSize={8}
                                                            wrapperStyle={{ fontSize: '11px', fontWeight: 600, lineHeight: '22px', paddingLeft: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            );
                                        })()}'''

content = pattern.sub(new_pie, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
