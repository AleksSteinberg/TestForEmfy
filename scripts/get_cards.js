const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjdhZGFmOTNlOGRhZTUyY2MyOWMwMTY1MGVmYmE3OTNmZmJjMWY0YTU2MzhlMWUzMmMxMjZkYWI3ZDJlNmExYWMxMDFhYTZhNTgyNjkzYTY2In0.eyJhdWQiOiJmMzVjNDAyNi02MGJiLTRhNWQtOGNmOC03YWIxYzQ4MzM5ODAiLCJqdGkiOiI3YWRhZjkzZThkYWU1MmNjMjljMDE2NTBlZmJhNzkzZmZiYzFmNGE1NjM4ZTFlMzJjMTI2ZGFiN2QyZTZhMWFjMTAxYWE2YTU4MjY5M2E2NiIsImlhdCI6MTcyODA0Mjk1NiwibmJmIjoxNzI4MDQyOTU2LCJleHAiOjE3OTIxOTUyMDAsInN1YiI6IjExNTk5NzAyIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxOTg2ODM4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZDMwNDk3NjgtOGZjYy00ZTQ4LWEzN2MtMjE2YTY1YzNhYjJmIiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.bhxLNl7cwyIpeCWH2mOc0vNJlfuaUyUfhK0Cqwpu-y-2-bvKs6CeVmMiuBN302OyQAbAkNa27Dvk5fykdMAvwgp30aaUgo9agYMOsUPfruDZKWMZC9-IKtmTLrp1z-jOLkKdlw5uWg0XIRC388NSWIT7_P05PdC3pSe9UZX2A1kT4A0YPI57LOz7TRSUVYfm4mJTOm3yPFutumyWGPjavHyJN1-fssTB3-HAyDNi6ZB-uW6OEeTpYs74OcbDZMD_c5sLDLegHXiXwHszZTpiyMQr3hK8tDFbBa925RdxB3bks1eMjyekFwX28KHkKwpY4oOUBcaBTqwtzyCjFjvqdw';
const apiUrlLeads = 'https://steinbergaleksey.amocrm.ru/api/v4/leads';
const apiUrlTasks = 'https://steinbergaleksey.amocrm.ru/api/v4/tasks';

let currentPage = 1;
let hasMoreLeads = true;
let currentOpenRow = null;

async function fetchLeads(page = 1) {
    try {
        const { data } = await axios.get(apiUrlLeads, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { limit: 3, page }
        });
        hasMoreLeads = data._embedded.leads.length === 3;
        return data._embedded.leads;
    } catch (error) {
        console.error('Ошибка при получении сделок:', error);
        hasMoreLeads = false;
    }
}

async function fetchTaskByLeadId(leadId) {
    try {
        const { data } = await axios.get(apiUrlTasks, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { filter: { entity_id: leadId, entity_type: 'leads' } }
        });
        return data._embedded.tasks[0] || null;
    } catch (error) {
        console.error('Ошибка при получении задачи:', error);
        return null;
    }
}

function getStatusCircle(task) {
    const currentDate = new Date();
    const taskDueDate = task?.complete_till ? new Date(task.complete_till * 1000) : null;
    
    let color;
    if (!task || (taskDueDate && taskDueDate < currentDate.setHours(0, 0, 0, 0))) {
        color = 'red';
    } else if (taskDueDate && taskDueDate.toDateString() === currentDate.toDateString()) {
        color = 'green';
    } else if (taskDueDate && taskDueDate > currentDate.setHours(0, 0, 0, 0) + 86400000) {
        color = 'yellow';
    }

    return `
        <svg width="10" height="10">
            <circle cx="5" cy="5" r="5" fill="${color}" />
        </svg>
    `;
}

function createLeadRow(lead) {
    const row = document.createElement('tr');
    row.dataset.leadData = JSON.stringify(lead);
    row.innerHTML = `
        <td>${lead.id}</td>
        <td class="lead-name" data-id="${lead.id}">${lead.name}<span class="loading" style="display:none;"></span></td>
        <td>${lead.price || '0'} ₽</td>
    `;
    row.addEventListener('click', () => loadLeadDetails(lead.id, row));
    return row;
}

async function loadLeadDetails(leadId, row) {
    if (currentOpenRow && currentOpenRow !== row) {
        const previousLeadData = JSON.parse(currentOpenRow.dataset.leadData);
        currentOpenRow.innerHTML = createLeadRow(previousLeadData).innerHTML;
    }

    row.innerHTML = `
        <td colspan="3" class="loading-cell">
            <div class="loading"></div>
        </td>
    `;

    const task = await fetchTaskByLeadId(leadId);

    if (!task) {
        row.innerHTML = `
            <td colspan="3">
                <div class="task-details">
                    <div><strong>Задача отсутствует</strong></div>
                    <div><strong>Статус:</strong> ${getStatusCircle(null)}</div>
                </div>
            </td>
        `;
    } else {
        const taskDueDate = task.complete_till ? new Date(task.complete_till * 1000).toLocaleDateString('ru-RU') : 'Н/Д';
        const taskStatus = task.status || 'Новая';

        row.innerHTML = `
            <td colspan="3">
                <div class="task-details">
                    <div><strong>ID:</strong> ${task.id || 'N/A'}</div>
                    <div><strong>Название:</strong> ${task.text || 'N/A'}</div>
                    <div><strong>Дата истечения:</strong> ${taskDueDate}</div>
                    <div><strong>Статус:</strong> ${getStatusCircle(task)}</div>
                </div>
            </td>
        `;
    }

    currentOpenRow = row;
}

async function loadLeads() {
    while (hasMoreLeads) {
        const leadsBatch = await fetchLeads(currentPage);
        if (!leadsBatch || leadsBatch.length === 0) break;

        const tbody = document.getElementById('leadsTable').querySelector('tbody');
        leadsBatch.forEach(lead => tbody.appendChild(createLeadRow(lead)));

        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

loadLeads();